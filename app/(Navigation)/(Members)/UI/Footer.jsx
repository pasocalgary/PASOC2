import * as React from "react";
import { Facebook } from "lucide-react";

export function Footer() {
	return (
		<footer className="bg-[#556B2F] text-white font-bold py-6 px-6 shadow-[0px_-10px_10px_rgba(0,0,0,0.25)]">
			<div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
				{/* Facebook icon 1st mobile, left desktop */}
				<a
					href="https://www.facebook.com/profile.php?id=61571891075008"
					target="_blank"
					rel="noopener noreferrer"
					className="order-1 text-white hover:text-gray-300 transition-colors duration-200"
				>
					<Facebook className="w-7 h-7" />
				</a>

				{/* Copyright 3rd mobile, center desktop*/}
				<p className="order-3 md:order-2 m-0 text-base text-center">
					© Copyright PASOC 2004 - 2026
				</p>

				{/* Contact 2nd mobile, right desktop*/}
				<div className="order-2 md:order-3 text-sm text-center md:text-right">
					For any site issues and inquires: <br />
					Email{" "}
					<a href="mailto:dgsv0508@yahoo.ca" className="underline">
						pasocalgary@gmail.com
					</a>
				</div>
			</div>
		</footer>
	);
}
