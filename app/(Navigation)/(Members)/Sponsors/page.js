"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { HeroSection } from "@/app/(Navigation)/(Members)/UI/HeroSection";
import { Skeleton } from "@/app/_components/Skeleton";

function CurrentSponsorCardReadOnly({ sponsor, onClick }) {
	return (
		<article
			onClick={onClick}
			className="w-full rounded-2xl border border-[#d8d2c4] bg-white p-4 md:p-5 shadow-[0_16px_36px_rgba(0,0,0,0.08)] cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
		>
			<div className="flex items-center gap-4 md:gap-5">
				<div className="w-14 h-14 md:w-16 md:h-16 rounded-xl border border-gray-300 bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
					{sponsor.imageUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={sponsor.imageUrl} alt={`${sponsor.name} logo`} className="w-full h-full object-contain" />
					) : (
						<Image
							src="/pasoc_logo.png"
							alt={`${sponsor.name} logo`}
							width={56}
							height={56}
							className="object-contain"
						/>
					)}
				</div>

				<div className="flex-1 min-w-0">
					<h3 className="text-lg md:text-xl font-bold leading-tight text-neutral-900">
						{sponsor.name}
					</h3>

					<p className="mt-1 truncate text-sm text-neutral-600">
						{sponsor.description ||
							"Information about this sponsor will be displayed here soon."}
					</p>
				</div>
			</div>
		</article>
	);
}

function SponsorInformation({ sponsor, onClose }) {
	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto relative"
				onClick={(event) => event.stopPropagation()}
			>
				<button
					onClick={onClose}
					className="absolute top-2 right-4 text-gray-500 hover:text-black text-lg"
					aria-label="Close"
				>
					✕
				</button>

				<div className="flex flex-col items-center text-center gap-3">
					<div className="w-20 h-20 rounded-2xl border border-gray-300 bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
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

					<h2 className="text-xl font-bold text-neutral-900">{sponsor.name}</h2>

					<p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">
						{sponsor.description ||
							"Information about this sponsor will be displayed here soon."}
					</p>

					{sponsor.link && (
						<a
							href={sponsor.link}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-block text-sm font-semibold text-white bg-[#556B2F] px-3 py-1.5 rounded-md hover:bg-[#445622]"
						>
							Visit Website ↗
						</a>
					)}

					{sponsor.events && sponsor.events.length > 0 && (
						<div className="w-full mt-2 text-left">
							<h3 className="text-sm font-semibold text-neutral-900 mb-1">Events Sponsored</h3>
							<ul className="text-sm text-neutral-600 list-disc list-inside">
								{sponsor.events.map((event) => (
									<li key={event.id}>{event.title}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function PreviousSponsorCardReadOnly({ sponsor, onClick }) {
	return (
		<article
			onClick={onClick}
			className="w-36 md:w-44 p-5 bg-white rounded-3xl shadow-[0_12px_30px_rgba(0,0,0,0.08)] border border-[#d8d2c4] flex flex-col items-center gap-4 cursor-pointer transition-transform duration-200 hover:-translate-y-1"
		>
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
		</article>
	);
}

export default function SponsorsPage() {
	const [currentSponsors, setCurrentSponsors] = useState([]);
	const [previousSponsors, setPreviousSponsors] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedSponsor, setSelectedSponsor] = useState(null);

	useEffect(() => {
		const loadSponsors = async () => {
			try {
				const res = await fetch("/api/sponsors", {
					cache: "no-store",
				});

				if (!res.ok) {
					console.error("Load failed:", await res.text());
					return;
				}

				const raw = await res.json();

				const allSponsors = raw.map((sponsor) => ({
					id: sponsor.id ?? sponsor.sponsorId,
					name: sponsor.name ?? sponsor.sponsorName ?? "",
					description:
						sponsor.description ?? sponsor.sponsorDescription ?? "",
					link: sponsor.link ?? "",
					imageUrl: sponsor.imageUrl ?? "",
					events: sponsor.events ?? [],
					status:
						sponsor.status ?? sponsor.sponsorStatus ?? "current",
				}));

				setCurrentSponsors(
					allSponsors.filter(
						(sponsor) => sponsor.status === "current",
					),
				);
				setPreviousSponsors(
					allSponsors.filter(
						(sponsor) => sponsor.status === "previous",
					),
				);
			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		};

		loadSponsors();
	}, []);

	return (
		<main>
			<HeroSection
				title="Sponsors"
				description="Community partners who help keep PASOC events, outreach, and programs thriving."
			/>

			<section className="relative overflow-hidden px-6 py-14 md:py-16">
				<div className="absolute -top-28 -left-20 w-64 h-64 rounded-full bg-[#b8c99a]/30 blur-3xl pointer-events-none" />
				<div className="absolute bottom-0 -right-20 w-72 h-72 rounded-full bg-[#f4e6af]/45 blur-3xl pointer-events-none" />

				<div className="relative max-w-6xl mx-auto space-y-14">
					<section className="space-y-6">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<h3 className="text-2xl md:text-3xl font-bold text-[#2a2420]">
								Featured
							</h3>
						</div>

						{loading ? (
							<div className="grid gap-4 md:grid-cols-2">
								{[0, 1].map((index) => (
									<div
										key={index}
										className="w-full rounded-2xl border border-[#d8d2c4] bg-white p-4 md:p-5 shadow-[0_16px_36px_rgba(0,0,0,0.08)]"
									>
										<div className="flex items-center gap-4 md:gap-5">
											<Skeleton className="w-14 h-14 md:w-16 md:h-16 rounded-xl shrink-0" />
											<div className="flex-1 min-w-0 flex flex-col gap-2">
												<Skeleton className="h-5 w-1/3" />
												<Skeleton className="h-4 w-2/3" />
											</div>
										</div>
									</div>
								))}
							</div>
						) : currentSponsors.length === 0 ? (
							<div className="rounded-3xl border border-dashed border-[#c8c1b3] bg-[#f7f4ec] p-8 text-center text-[#6b625a]">
								No featured sponsors are listed yet.
							</div>
						) : (
							<div className="grid gap-4 md:grid-cols-2">
								{currentSponsors.map((sponsor) => (
									<CurrentSponsorCardReadOnly
										key={sponsor.id}
										sponsor={sponsor}
										onClick={() => setSelectedSponsor(sponsor)}
									/>
								))}
							</div>
						)}
					</section>

					<section className="space-y-6">
						<div className="h-px w-full bg-linear-to-r from-transparent via-[#556B2F] to-transparent" />
						<div className="flex justify-center">
							<h3 className="text-center text-2xl md:text-3xl font-bold text-[#2a2420]">
								Over the Years
							</h3>
						</div>

						{loading ? (
							<div className="flex flex-wrap justify-center gap-6">
								{[0, 1, 2, 3].map((index) => (
									<div
										key={index}
										className="w-36 md:w-44 p-5 bg-white rounded-3xl shadow-[0_12px_30px_rgba(0,0,0,0.08)] border border-[#d8d2c4] flex flex-col items-center gap-4"
									>
										<Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
										<Skeleton className="h-4 w-20" />
									</div>
								))}
							</div>
						) : previousSponsors.length === 0 ? (
							<div className="rounded-3xl border border-dashed border-[#c8c1b3] bg-[#f7f4ec] p-8 text-center text-[#6b625a]">
								No sponsors over the years are listed yet.
							</div>
						) : (
							<div className="flex flex-wrap justify-center gap-6">
								{previousSponsors.map((sponsor) => (
									<PreviousSponsorCardReadOnly
										key={sponsor.id}
										sponsor={sponsor}
										onClick={() => setSelectedSponsor(sponsor)}
									/>
								))}
							</div>
						)}
					</section>
				</div>
			</section>

			{selectedSponsor && (
				<SponsorInformation
					sponsor={selectedSponsor}
					onClose={() => setSelectedSponsor(null)}
				/>
			)}
		</main>
	);
}
