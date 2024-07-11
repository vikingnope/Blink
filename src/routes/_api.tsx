import { getDefaultServer, getServer } from "@/utils/storage/servers";
import { getUser } from "@/utils/storage/user";
import { axiosClient } from "@/utils/store/api";
import { getSystemApi } from "@jellyfin/sdk/lib/utils/api/system-api";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import React from "react";

export const Route = createFileRoute("/_api")({
	beforeLoad: async ({ context, location }) => {
		// console.log(context.api);
		if (!context.api) {
			const currentServerId = await getDefaultServer();
			if (currentServerId) {
				const currentServer = await getServer(currentServerId);
				const apiTemp = context.jellyfinSDK.createApi(
					currentServer?.address,
					null,
					axiosClient,
				);
				try {
					await getSystemApi(apiTemp).getPingSystem();
				} catch (error) {
					console.error(error);
					throw redirect({
						to: "/error/$code",
						params: {
							code: "101",
						},
					});
				}
				const userOnDisk = await getUser();
				if (userOnDisk) {
					if (location.pathname !== "/login/manual") {
						const apiTemp = context.jellyfinSDK.createApi(
							currentServer?.address,
							userOnDisk.AccessToken,
							axiosClient,
						);
						try {
							await getUserApi(apiTemp).getCurrentUser();
						} catch (error) {
							console.error(error);
							throw redirect({
								to: "/login/manual",
								search: {
									redirect: location.href,
								},
							});
						}
					}
					context.createApi(currentServer?.address, userOnDisk.AccessToken);
				} else {
					context.createApi(currentServer?.address, undefined); // Creates Api
				}
			}
		} else if (context.api) {
			if (context.api.accessToken && location.pathname !== "/login/manual") {
				try {
					return {
						user: await getUserApi(context.api).getCurrentUser(),
					}; // Verify user is able to authenticate
				} catch (error) {
					console.error(error);
					throw redirect({
						to: "/login/manual",
						search: {
							redirect: location.href,
						},
					});
				}
			}
		}
	},
});