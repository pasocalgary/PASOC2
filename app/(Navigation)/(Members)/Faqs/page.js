"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeroSection } from "../UI/HeroSection.jsx";
import { Skeleton } from "@/app/_components/Skeleton";

const PAGE_LIMIT = 5;

function FaqItem({ question, answer }) {
	const [isOpen, setIsOpen] = React.useState(false);
	const answerLines = String(answer || "")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	return (
		<article className="w-full rounded-2xl border border-gray-300 bg-[#f3f4f6] px-6 py-4 shadow-sm">
			<div className="flex items-center justify-between gap-3">
				<h3 className="text-2xl font-semibold text-[#526f2c] leading-tight">
					{question}
				</h3>
				<button
					type="button"
					onClick={() => setIsOpen((previous) => !previous)}
					className="text-black text-xl font-semibold"
					aria-label={isOpen ? "Hide answer" : "Show answer"}
				>
					{isOpen ? "▲" : "▼"}
				</button>
			</div>

			<AnimatePresence initial={false}>
				{isOpen && (
					<motion.div
						key="answer"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: "easeInOut" }}
						className="overflow-hidden"
					>
						<div className="mt-3 border-t border-gray-300 pt-4">
							{answerLines.length > 1 ? (
								<ul className="list-disc pl-6 space-y-1 text-lg text-black">
									{answerLines.map((line, index) => (
										<li key={index}>{line}</li>
									))}
								</ul>
							) : (
								<p className="text-lg text-black">{answer}</p>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</article>
	);
}

export default function FaqsPage() {
	const [faqs, setFaqs] = React.useState([]);
	const [currentPage, setCurrentPage] = React.useState(1);
	const [pagination, setPagination] = React.useState({
		page: 1,
		pageCount: 1,
		hasPrevPage: false,
		hasNextPage: false,
	});
	const [isLoading, setIsLoading] = React.useState(true);
	const [errorMessage, setErrorMessage] = React.useState("");

	React.useEffect(() => {
		const loadFaqs = async () => {
			try {
				setIsLoading(true);
				setErrorMessage("");
				const searchParams = new URLSearchParams({
					page: String(currentPage),
					limit: String(PAGE_LIMIT),
				});
				const response = await fetch(`/api/faqs?${searchParams.toString()}`, {
					cache: "no-store",
				});
				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to load FAQs");
				}

				const rows = Array.isArray(data?.data)
					? data.data
					: Array.isArray(data)
						? data
						: [];
				const meta = data.pagination || {};
				const page = Number(meta.page) || 1;
				const pageCount = Math.max(1, Number(meta.pageCount) || 1);

				setFaqs(rows);
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
				setErrorMessage(error.message || "Failed to load FAQs");
			} finally {
				setIsLoading(false);
			}
		};

		loadFaqs();
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
			<HeroSection title="Frequently Asked Questions" />
			<section className="w-full max-w-6xl mx-auto px-6 py-10 space-y-6">
				{errorMessage && (
					<p className="text-red-700 font-medium">{errorMessage}</p>
				)}
				{isLoading ? (
					[0, 1, 2, 3, 4].map((index) => (
						<div
							key={index}
							className="w-full rounded-2xl border border-gray-300 bg-[#f3f4f6] px-6 py-4 shadow-sm"
						>
							<div className="flex items-center justify-between gap-3">
								<Skeleton className="h-6 w-2/3" />
								<Skeleton className="h-6 w-6 shrink-0 rounded-full" />
							</div>
						</div>
					))
				) : !errorMessage && faqs.length === 0 ? (
					<p className="text-gray-700">No FAQs found.</p>
				) : (
					faqs.map((faq) => (
						<FaqItem
							key={faq.id}
							question={faq.question}
							answer={faq.answer}
						/>
					))
				)}

				{!isLoading &&
					!errorMessage &&
					pagination.pageCount > 1 && (
						<nav
							className="flex flex-wrap items-center justify-center gap-3 pt-2 text-sm"
							aria-label="FAQs pagination"
						>
							<button
								type="button"
								onClick={() => setCurrentPage(1)}
								disabled={!pagination.hasPrevPage}
								className="font-semibold text-neutral-700 transition-colors hover:text-black disabled:cursor-not-allowed disabled:text-neutral-400"
								aria-label="Go to first page"
							>
								&lt;&lt;
							</button>
							<button
								type="button"
								onClick={() =>
									setCurrentPage((previous) => Math.max(1, previous - 1))
								}
								disabled={!pagination.hasPrevPage}
								className="font-semibold text-neutral-700 transition-colors hover:text-black disabled:cursor-not-allowed disabled:text-neutral-400"
							>
								previous
							</button>

							{visiblePageNumbers.map((pageNumber, index) => {
								const isActive = pageNumber === pagination.page;
								const showComma = index < visiblePageNumbers.length - 1;

								return (
									<span key={pageNumber} className="flex items-center gap-0">
										<button
											type="button"
											onClick={() => setCurrentPage(pageNumber)}
											className={`font-semibold transition-colors ${
												isActive
													? "text-black"
													: "text-neutral-500 hover:text-neutral-700"
											}`}
											aria-label={`Go to page ${pageNumber}`}
											aria-current={isActive ? "page" : undefined}
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
										Math.min(pagination.pageCount, previous + 1),
									)
								}
								disabled={!pagination.hasNextPage}
								className="font-semibold text-neutral-500 transition-colors hover:text-black disabled:cursor-not-allowed disabled:text-neutral-300"
							>
								next
							</button>
							<button
								type="button"
								onClick={() => setCurrentPage(pagination.pageCount)}
								disabled={!pagination.hasNextPage}
								className="font-semibold text-neutral-500 transition-colors hover:text-black disabled:cursor-not-allowed disabled:text-neutral-300"
								aria-label="Go to last page"
							>
								&gt;&gt;
							</button>
						</nav>
					)}
			</section>
		</main>
	);
}
