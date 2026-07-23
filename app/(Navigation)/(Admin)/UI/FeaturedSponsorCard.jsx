import React from "react";
import Image from "next/image";
import { X } from "lucide-react";

export default function FeaturedSponsorCard({
	sponsor,
	onDelete,
	onEdit,
	onMoveToPrevious,
}) {
	return (
		<div className="relative w-full max-w-7xl rounded-3xl border border-[#d8d2c4] bg-white p-5 md:p-7 shadow-[0_16px_36px_rgba(0,0,0,0.08)]">
			<div className="flex flex-col md:flex-row gap-5 md:gap-7">
				<div className="w-24 h-24 md:w-30 md:h-30 rounded-2xl border border-gray-300 bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
					{sponsor.imageUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={sponsor.imageUrl} alt={`${sponsor.name} logo`} className="w-full h-full object-contain" />
					) : (
						<Image
							src="/pasoc_logo.png"
							alt={`${sponsor.name} logo`}
							width={80}
							height={80}
							className="object-contain"
						/>
					)}
				</div>

				<div className="flex-1 min-w-0">
					<h3 className="text-3xl font-bold leading-tight text-neutral-900 md:text-4xl mb-3">
						{sponsor.name}
					</h3>

					<p className="whitespace-pre-line text-lg leading-relaxed text-neutral-700 md:text-xl">
						{sponsor.description ||
							"Information about this sponsor will be displayed here soon."}
					</p>

					{sponsor.link && (
						<a
							href={sponsor.link}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-2 inline-block text-sm font-semibold text-[#556B2F] hover:underline"
						>
							Visit Website
						</a>
					)}

					{sponsor.events && sponsor.events.length > 0 && (
						<p className="mt-3 text-sm text-neutral-500">
							Sponsored: {sponsor.events.map((event) => event.title).join(", ")}
						</p>
					)}
				</div>
			</div>

			<div className="mt-5 flex flex-wrap justify-end gap-2">
				<button
					type="button"
					onClick={() => onEdit(sponsor.id)}
					className="rounded-md bg-[#556B2F] px-3 py-1 text-sm font-semibold text-white hover:bg-[#6b8e23] transition-colors"
				>
					Edit
				</button>
				<button
					type="button"
					onClick={() => onMoveToPrevious(sponsor.id)}
					className="rounded-md bg-gray-700 px-3 py-1 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
				>
					Move to Over the Years
				</button>
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
