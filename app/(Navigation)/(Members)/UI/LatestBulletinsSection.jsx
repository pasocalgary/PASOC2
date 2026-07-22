"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/app/_components/Skeleton";

export function LatestBulletinsSection() {
	const router = useRouter();
	const [bulletins, setBulletins] = useState([]);
	const [isLoadingBulletins, setIsLoadingBulletins] = useState(true);
	const [bulletinsError, setBulletinsError] = useState("");
	const [bulletinsSlideIndex, setBulletinsSlideIndex] = useState(0);
	const [isSmallScreen, setIsSmallScreen] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const loadBulletins = async () => {
			try {
				setIsLoadingBulletins(true);
				setBulletinsError("");
				const searchParams = new URLSearchParams({
					page: "1",
					limit: "5",
					published: "true",
				});

				const response = await fetch(
					`/api/bulletins?${searchParams.toString()}`,
					{
						cache: "no-store",
					},
				);
				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to load bulletins");
				}

				if (isMounted) {
					const rows = Array.isArray(data.data)
						? data.data
						: Array.isArray(data)
							? data
							: [];
					setBulletins(rows);
				}
			} catch (error) {
				if (isMounted) {
					setBulletinsError(
						error.message || "Failed to load latest bulletins",
					);
				}
			} finally {
				if (isMounted) {
					setIsLoadingBulletins(false);
				}
			}
		};

		loadBulletins();

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(max-width: 767px)");

		const updateScreenSize = (event) => {
			setIsSmallScreen(event.matches);
		};

		setIsSmallScreen(mediaQuery.matches);

		if (typeof mediaQuery.addEventListener === "function") {
			mediaQuery.addEventListener("change", updateScreenSize);
			return () =>
				mediaQuery.removeEventListener("change", updateScreenSize);
		}

		mediaQuery.addListener(updateScreenSize);
		return () => mediaQuery.removeListener(updateScreenSize);
	}, []);

	const latestBulletins = useMemo(() => {
		const sortedPublished = [...bulletins]
			.filter((item) => item?.isPublished)
			.sort((left, right) => {
				const leftDate = new Date(
					left.publishDate || left.createdAt || left.updatedAt || 0,
				).getTime();
				const rightDate = new Date(
					right.publishDate ||
						right.createdAt ||
						right.updatedAt ||
						0,
				).getTime();

				if (rightDate !== leftDate) {
					return rightDate - leftDate;
				}

				return (
					Number(right.bulletinId || 0) - Number(left.bulletinId || 0)
				);
			});

		return sortedPublished.slice(0, 5);
	}, [bulletins]);

	const bulletinsVisibleCount = isSmallScreen ? 1 : 3;

	const bulletinPageCount = useMemo(() => {
		if (latestBulletins.length === 0) {
			return 0;
		}

		if (latestBulletins.length <= bulletinsVisibleCount) {
			return 1;
		}

		return latestBulletins.length - bulletinsVisibleCount + 1;
	}, [bulletinsVisibleCount, latestBulletins.length]);

	const bulletinDotCount = useMemo(() => {
		if (isSmallScreen) {
			return Math.max(3, bulletinPageCount);
		}

		return 3;
	}, [bulletinPageCount, isSmallScreen]);

	useEffect(() => {
		if (bulletinPageCount === 0) {
			setBulletinsSlideIndex(0);
			return;
		}

		if (bulletinsSlideIndex >= bulletinPageCount) {
			setBulletinsSlideIndex(0);
		}
	}, [bulletinPageCount, bulletinsSlideIndex]);

	const visibleBulletins = useMemo(() => {
		if (latestBulletins.length <= bulletinsVisibleCount) {
			return latestBulletins;
		}

		return latestBulletins.slice(
			bulletinsSlideIndex,
			bulletinsSlideIndex + bulletinsVisibleCount,
		);
	}, [bulletinsSlideIndex, bulletinsVisibleCount, latestBulletins]);

	const goToNextBulletins = () => {
		if (bulletinPageCount <= 1) {
			return;
		}

		setBulletinsSlideIndex(
			(previous) => (previous + 1) % bulletinPageCount,
		);
	};

	const goToPreviousBulletins = () => {
		if (bulletinPageCount <= 1) {
			return;
		}

		setBulletinsSlideIndex(
			(previous) =>
				(previous - 1 + bulletinPageCount) % bulletinPageCount,
		);
	};

	return (
		<section className="bg-white py-24 px-6 text-neutral-900">
			<div className="max-w-6xl mx-auto flex flex-col gap-12">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold">
						Latest Bulletin Posts
					</h2>
				</div>

				{isLoadingBulletins && (
					<div className="grid gap-8 px-2 md:grid-cols-3 md:px-14">
						{[0, 1, 2].map((index) => (
							<div
								key={index}
								className="bg-neutral-100 p-8 rounded-2xl"
							>
								<Skeleton className="h-6 w-3/4 mb-4" />
								<div className="flex flex-col gap-2 mb-6">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-2/3" />
								</div>
								<Skeleton className="h-4 w-24" />
							</div>
						))}
					</div>
				)}

				{!isLoadingBulletins && bulletinsError && (
					<p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
						{bulletinsError}
					</p>
				)}

				{!isLoadingBulletins &&
					!bulletinsError &&
					latestBulletins.length === 0 && (
						<p className="text-neutral-700">
							No published bulletins yet.
						</p>
					)}

				{!isLoadingBulletins &&
					!bulletinsError &&
					visibleBulletins.length > 0 && (
						<div className="flex flex-col gap-6">
							<div className="group relative">
								<button
									type="button"
									onClick={goToPreviousBulletins}
									disabled={bulletinPageCount <= 1}
									className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-neutral-300 bg-white/90 px-3 py-2 text-sm font-semibold shadow-sm transition-all duration-300 md:block md:opacity-0 md:pointer-events-none md:-translate-x-2 md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:translate-x-0 focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:translate-x-0 disabled:cursor-not-allowed disabled:opacity-40"
								>
									←
								</button>

								<div className="grid gap-8 px-2 md:grid-cols-3 md:px-14">
									{visibleBulletins.map((item) => (
										<div
											key={item.bulletinId}
											className="bg-neutral-100 p-8 rounded-2xl transition-all duration-200 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
										>
											<h3 className="text-xl font-semibold text-primary-600 mb-4">
												{item.title}
											</h3>

											<p className="text-neutral-700 leading-relaxed mb-6">
												{item.body}
											</p>

											<button
												className="text-primary-600 font-semibold text-sm hover:underline"
												onClick={() =>
													router.push("/Bulletins")
												}
											>
												Read more →
											</button>
										</div>
									))}
								</div>

								<button
									type="button"
									onClick={goToNextBulletins}
									disabled={bulletinPageCount <= 1}
									className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-neutral-300 bg-white/90 px-3 py-2 text-sm font-semibold shadow-sm transition-all duration-300 md:block md:opacity-0 md:pointer-events-none md:translate-x-2 md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:translate-x-0 focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:translate-x-0 disabled:cursor-not-allowed disabled:opacity-40"
								>
									→
								</button>
							</div>

							<div className="flex items-center justify-center gap-2">
								{Array.from(
									{ length: bulletinDotCount },
									(_, dotIndex) => {
										const hasGroup =
											dotIndex < bulletinPageCount;
										const isActive =
											hasGroup &&
											dotIndex === bulletinsSlideIndex;

										return (
											<button
												key={dotIndex}
												type="button"
												onClick={() => {
													if (hasGroup) {
														setBulletinsSlideIndex(
															dotIndex,
														);
													}
												}}
												disabled={!hasGroup}
												className={`h-2.5 w-2.5 rounded-full transition-colors ${
													isActive
														? "bg-black"
														: "bg-neutral-500"
												} ${!hasGroup ? "opacity-60 cursor-default" : ""}`}
												aria-label={`Go to bulletin page ${dotIndex + 1}`}
												aria-current={
													isActive
														? "true"
														: undefined
												}
											/>
										);
									},
								)}
							</div>
						</div>
					)}
			</div>
		</section>
	);
}
