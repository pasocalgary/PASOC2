"use client";

import { useEffect, useState } from "react";
import { HeroSection } from "@/app/(Navigation)/(Members)/UI/HeroSection";
import { Skeleton } from "@/app/_components/Skeleton";

function formatDisplayDate(value) {
	if (!value) {
		return "No publish date";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return String(value);
	}

	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "America/Edmonton",
	}).format(date);
}

const PAGE_LIMIT = 5;

export default function Bulletin() {
	const [bulletins, setBulletins] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [pagination, setPagination] = useState({
		page: 1,
		pageCount: 1,
		hasPrevPage: false,
		hasNextPage: false,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		const loadBulletins = async () => {
			try {
				setIsLoading(true);
				setErrorMessage("");
				const searchParams = new URLSearchParams({
					page: String(currentPage),
					limit: String(PAGE_LIMIT),
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

				const rows = Array.isArray(data.data)
					? data.data
					: Array.isArray(data)
						? data
						: [];
				const meta = data.pagination || {};
				const page = Number(meta.page) || 1;
				const pageCount = Math.max(1, Number(meta.pageCount) || 1);

				setBulletins(rows);
				setPagination({
					page,
					pageCount,
					hasPrevPage: Boolean(meta.hasPrevPage),
					hasNextPage: Boolean(meta.hasNextPage),
				});

				if (page !== currentPage) {
					setCurrentPage(page);
				}
			} catch (error) {
				setErrorMessage(error.message || "Failed to load bulletins");
			} finally {
				setIsLoading(false);
			}
		};

		loadBulletins();
	}, [currentPage]);

	const pageWindowStart = Math.max(
		1,
		Math.min(pagination.page - 1, pagination.pageCount - 2),
	);
	const pageWindowEnd = Math.min(pagination.pageCount, pageWindowStart + 2);
	const visiblePageNumbers = Array.from(
		{ length: pageWindowEnd - pageWindowStart + 1 },
		(_, index) => pageWindowStart + index,
	);

	return (
		<main>
			{/* HERO */}
			<HeroSection
				title="Bulletins"
				description="Stay informed with the latest PASOC announcements and community updates."
			/>
			{/* BULLETIN */}
			<section className="bg-neutral-100 py-24 px-6">
				<div className="max-w-6xl mx-auto flex flex-col gap-6">
					{isLoading &&
						[0, 1, 2].map((index) => (
							<article
								key={index}
								className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
							>
								<div className="flex flex-col gap-6 p-6 md:p-8">
									<Skeleton className="h-9 w-2/3" />
									<div className="flex flex-col gap-2">
										<Skeleton className="h-5 w-full" />
										<Skeleton className="h-5 w-full" />
										<Skeleton className="h-5 w-1/2" />
									</div>
									<Skeleton className="h-3 w-40 self-end" />
								</div>
							</article>
						))}

					{!isLoading && errorMessage && (
						<p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
							{errorMessage}
						</p>
					)}

					{!isLoading && !errorMessage && bulletins.length === 0 && (
						<p className="text-neutral-700 leading-relaxed text-lg">
							No bulletins have been published yet.
						</p>
					)}

					{!isLoading &&
						!errorMessage &&
						bulletins.map((bulletin) => {
							const publishAnchorTime = bulletin.publishDate
								? new Date(bulletin.publishDate).getTime()
								: bulletin.createdAt
									? new Date(bulletin.createdAt).getTime()
									: NaN;
							const updatedAtTime = bulletin.updatedAt
								? new Date(bulletin.updatedAt).getTime()
								: NaN;
							const showUpdatedAt =
								Number.isFinite(publishAnchorTime) &&
								Number.isFinite(updatedAtTime) &&
								updatedAtTime - publishAnchorTime > 1000;

							return (
								<article
									key={bulletin.bulletinId}
									className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
								>
									<div className="flex flex-col gap-6 p-6 md:p-8">
										<h2 className="text-3xl font-bold leading-tight text-neutral-900 md:text-4xl">
											{bulletin.title}
										</h2>
										<p className="whitespace-pre-line text-neutral-700 leading-relaxed text-lg">
											{bulletin.body}
										</p>
										<div className="self-end pt-2 space-y-1 text-right text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
											<p>
												Published at{" "}
												{formatDisplayDate(
													bulletin.publishDate,
												)}
											</p>
											{showUpdatedAt && (
												<p>
													Updated at{" "}
													{formatDisplayDate(
														bulletin.updatedAt,
													)}
												</p>
											)}
										</div>
									</div>
								</article>
							);
						})}

					{!isLoading &&
						!errorMessage &&
						pagination.pageCount > 1 && (
							<nav
								className="flex flex-wrap items-center justify-center gap-3 pt-2 text-sm"
								aria-label="Bulletins pagination"
							>
								<button
									type="button"
									onClick={() => setCurrentPage(1)}
									disabled={!pagination.hasPrevPage}
									className="font-semibold text-neutral-700 transition-colors hover:text-black disabled:cursor-not-allowed disabled:text-neutral-400"
									aria-label="Go to newest page"
								>
									&lt;&lt;
								</button>
								<button
									type="button"
									onClick={() =>
										setCurrentPage((previous) =>
											Math.max(1, previous - 1),
										)
									}
									disabled={!pagination.hasPrevPage}
									className="font-semibold text-neutral-700 transition-colors hover:text-black disabled:cursor-not-allowed disabled:text-neutral-400"
								>
									previous
								</button>

								{visiblePageNumbers.map((pageNumber, index) => {
									const isActive =
										pageNumber === pagination.page;
									const showComma =
										index < visiblePageNumbers.length - 1;

									return (
										<span
											key={pageNumber}
											className="flex items-center gap-0"
										>
											<button
												type="button"
												onClick={() =>
													setCurrentPage(pageNumber)
												}
												className={`font-semibold transition-colors ${
													isActive
														? "text-black"
														: "text-neutral-500 hover:text-neutral-700"
												}`}
												aria-label={`Go to page ${pageNumber}`}
												aria-current={
													isActive
														? "page"
														: undefined
												}
											>
												{pageNumber}
											</button>
											{showComma && (
												<span
													className="font-semibold text-neutral-500"
													aria-hidden="true"
												>
													,
												</span>
											)}
										</span>
									);
								})}

								<button
									type="button"
									onClick={() =>
										setCurrentPage((previous) =>
											Math.min(
												pagination.pageCount,
												previous + 1,
											),
										)
									}
									disabled={!pagination.hasNextPage}
									className="font-semibold text-neutral-500 transition-colors hover:text-black disabled:cursor-not-allowed disabled:text-neutral-300"
								>
									next
								</button>
								<button
									type="button"
									onClick={() =>
										setCurrentPage(pagination.pageCount)
									}
									disabled={!pagination.hasNextPage}
									className="font-semibold text-neutral-500 transition-colors hover:text-black disabled:cursor-not-allowed disabled:text-neutral-300"
									aria-label="Go to oldest page"
								>
									&gt;&gt;
								</button>
							</nav>
						)}
				</div>
			</section>
		</main>
	);
}
