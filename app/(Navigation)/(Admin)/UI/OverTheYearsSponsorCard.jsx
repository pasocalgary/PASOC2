import React from "react";
import Image from "next/image";
import { X } from "lucide-react";

export default function OverTheYearsSponsorCard({ sponsor, onDelete }) {
	return (
		<div className="relative w-36 md:w-44 p-5 bg-white rounded-3xl shadow-[0_12px_30px_rgba(0,0,0,0.08)] border border-[#d8d2c4] flex flex-col items-center gap-4 transition-transform duration-200 hover:-translate-y-1">
			<div className="w-20 h-20 bg-gray-200 rounded-2xl border border-gray-300 flex items-center justify-center shrink-0 overflow-hidden">
				{sponsor.imageUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={sponsor.imageUrl} alt={`${sponsor.name} logo`} className="w-full h-full object-contain" />
				) : (
					<Image
						src="/pasoc_logo.png"
						alt={`${sponsor.name} logo`}
						width={64}
						height={64}
						className="object-contain"
					/>
				)}
			</div>

			<div className="text-center">
				<h3 className="font-bold text-neutral-900 text-sm leading-snug">
					{sponsor.name}
				</h3>
			</div>
			<button
				type="button"
				onClick={() => onDelete(sponsor.id)}
				className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-700 flex items-center justify-center hover:bg-red-800 text-white transition-colors"
				aria-label="Delete sponsor"
			>
				<X size={16} strokeWidth={2.5} />
			</button>
		</div>
	);
}
