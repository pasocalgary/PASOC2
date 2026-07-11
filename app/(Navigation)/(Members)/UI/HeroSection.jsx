"use client";
import * as React from "react";
import Link from "next/link";
import { useUserAuth } from "../../../_utils/auth-context";

export function HeroSection({ title, description }) {
	const [showButtons, setShowButtons] = React.useState(false);
	const { user, roleId, loading } = useUserAuth();

	React.useEffect(() => {
		// window is undefined on the server; only read it in the browser
		if (typeof window !== "undefined") {
			setShowButtons(window.location.pathname === "/");
		}
	}, []);

	const isMember = user && roleId && roleId !== 4;

	return (
		<section className="relative flex flex-col w-full min-h-40 sm:min-h-75 overflow-hidden">
			<img
				src="/Pasoc_banner.png"
				alt="PASOC community gathering"
				className="object-cover absolute inset-0 w-full h-full pointer-events-none"
			/>

			<div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(132,164,77,1)_0%,rgba(132,164,77,1)_10%,rgba(132,164,77,0)_100%)] z-0" />

			<div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 sm:py-16 flex flex-col justify-center items-start">
				<h1 className="text-[36px] sm:text-[70px] text-white m-0 font-serif leading-tight">
					{title}
				</h1>
				<p className="text-[14px] sm:text-[18px] text-white mt-2 font-serif max-w-xs sm:max-w-120">
					{description}
				</p>

				{showButtons && !loading && (
					<div className="flex flex-wrap gap-3 mt-5 sm:gap-4 sm:mt-7 text-[16px] sm:text-[20px] font-semibold text-black">
						{isMember ? (
							<Link
								href="/Events"
								className="flex items-center justify-center py-2 px-5 sm:py-3 sm:px-8 rounded-full bg-[#f3f4f6] shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-white"
							>
								View Events
							</Link>
						) : (
							<>
								<Link
									href="/Login/Membership"
									className="flex items-center justify-center py-2 px-5 sm:py-3 sm:px-8 rounded-full bg-[#f3f4f6] shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-white"
								>
									Become a Member
								</Link>
								<Link
									href="/Guest"
									className="flex items-center justify-center py-2 px-5 sm:py-3 sm:px-8 rounded-full bg-[#f3f4f6] shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-white"
								>
									Join Newsletter
								</Link>
							</>
						)}
					</div>
				)}
			</div>
		</section>
	);
}
