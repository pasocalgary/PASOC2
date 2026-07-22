"use client";

import React from "react";
import { FaqsCard } from "./FaqsCard.jsx";
import { Skeleton } from "@/app/_components/Skeleton";

const PAGE_LIMIT = 5;

export function FaqsManager() {
	const [faqs, setFaqs] = React.useState([]);
	const [currentPage, setCurrentPage] = React.useState(1);
	const [pagination, setPagination] = React.useState({
		page: 1,
		pageCount: 1,
		hasPrevPage: false,
		hasNextPage: false,
	});
	const [question, setQuestion] = React.useState("");
	const [answer, setAnswer] = React.useState("");
	const [editingId, setEditingId] = React.useState(null);
	const [editQuestion, setEditQuestion] = React.useState("");
	const [editAnswer, setEditAnswer] = React.useState("");
	const [isAdding, setIsAdding] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(true);
	const [errorMessage, setErrorMessage] = React.useState("");
	const [confirmModal, setConfirmModal] = React.useState({
		isOpen: false,
		action: null,
		faqId: null,
	});

	const getFaqValidationError = (questionValue, answerValue) => {
		const trimmedQuestion = String(questionValue || "").trim();
		const trimmedAnswer = String(answerValue || "").trim();

		if (!trimmedQuestion || !trimmedAnswer) {
			return "Question and answer are required.";
		}

		return "";
	};

	const loadFaqs = React.useCallback(
		async (pageToLoad = currentPage) => {
			try {
				setIsLoading(true);
				setErrorMessage("");
				const searchParams = new URLSearchParams({
					page: String(pageToLoad),
					limit: String(PAGE_LIMIT),
				});
				const response = await fetch(
					`/api/faqs?${searchParams.toString()}`,
					{
						cache: "no-store",
					},
				);
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

				if (page !== pageToLoad) {
					setCurrentPage(page);
				}
			} catch (error) {
				setErrorMessage(error.message || "Failed to load FAQs");
			} finally {
				setIsLoading(false);
			}
		},
		[currentPage],
	);

	React.useEffect(() => {
		loadFaqs(currentPage);
	}, [currentPage, loadFaqs]);

	const addFaq = async () => {
		const trimmedQuestion = question.trim();
		const trimmedAnswer = answer.trim();
		const validationError = getFaqValidationError(
			trimmedQuestion,
			trimmedAnswer,
		);

		if (validationError) {
			setErrorMessage(validationError);
			return false;
		}

		try {
			setErrorMessage("");
			const response = await fetch("/api/faqs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					question: trimmedQuestion,
					answer: trimmedAnswer,
				}),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to add FAQ");
			}

			await loadFaqs(1);
			setCurrentPage(1);
			setQuestion("");
			setAnswer("");
			setIsAdding(false);
			return true;
		} catch (error) {
			setErrorMessage(error.message || "Failed to add FAQ");
			return false;
		}
	};

	const startEdit = (faq) => {
		setEditingId(faq.id);
		setEditQuestion(faq.question);
		setEditAnswer(faq.answer);
	};

	const saveEdit = async (id) => {
		const trimmedQuestion = editQuestion.trim();
		const trimmedAnswer = editAnswer.trim();
		const validationError = getFaqValidationError(
			trimmedQuestion,
			trimmedAnswer,
		);

		if (validationError) {
			setErrorMessage(validationError);
			return false;
		}

		try {
			setErrorMessage("");
			const response = await fetch(`/api/faqs/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					question: trimmedQuestion,
					answer: trimmedAnswer,
				}),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to update FAQ");
			}

			await loadFaqs(currentPage);
			setEditingId(null);
			setEditQuestion("");
			setEditAnswer("");
			return true;
		} catch (error) {
			setErrorMessage(error.message || "Failed to update FAQ");
			return false;
		}
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditQuestion("");
		setEditAnswer("");
		setErrorMessage("");
	};

	const openDeleteConfirmModal = (id) => {
		setConfirmModal({
			isOpen: true,
			action: "delete",
			faqId: id,
		});
	};

	const openCreateConfirmModal = () => {
		const trimmedQuestion = question.trim();
		const trimmedAnswer = answer.trim();
		const validationError = getFaqValidationError(
			trimmedQuestion,
			trimmedAnswer,
		);

		if (validationError) {
			setErrorMessage(validationError);
			return;
		}

		setConfirmModal({
			isOpen: true,
			action: "create",
			faqId: null,
		});
	};

	const openEditConfirmModal = (id) => {
		const trimmedQuestion = editQuestion.trim();
		const trimmedAnswer = editAnswer.trim();
		const validationError = getFaqValidationError(
			trimmedQuestion,
			trimmedAnswer,
		);

		if (validationError) {
			setErrorMessage(validationError);
			return;
		}

		setConfirmModal({
			isOpen: true,
			action: "edit",
			faqId: id,
		});
	};

	const closeConfirmModal = () => {
		const shouldClearFormError =
			confirmModal.action === "create" || confirmModal.action === "edit";

		setConfirmModal({
			isOpen: false,
			action: null,
			faqId: null,
		});

		if (shouldClearFormError) {
			setErrorMessage("");
		}
	};

	const deleteFaq = async (id) => {
		try {
			setErrorMessage("");
			const response = await fetch(`/api/faqs/${id}`, {
				method: "DELETE",
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to delete FAQ");
			}

			await loadFaqs(currentPage);
			if (editingId === id) {
				cancelEdit();
			}
			closeConfirmModal();
		} catch (error) {
			setErrorMessage(error.message || "Failed to delete FAQ");
		}
	};

	const selectedFaqQuestion =
		faqs.find((faq) => faq.id === confirmModal.faqId)?.question ||
		"this FAQ";
	const createFaqQuestion = question.trim() || "this FAQ";
	const editFaqQuestion = editQuestion.trim() || "this FAQ";
	const showGlobalError =
		Boolean(errorMessage) && !isAdding && editingId === null;
	const pageWindowStart = Math.max(
		1,
		Math.min(pagination.page - 1, pagination.pageCount - 2),
	);
	const pageWindowEnd = Math.min(pagination.pageCount, pageWindowStart + 2);
	const visiblePageNumbers = Array.from(
		{ length: pageWindowEnd - pageWindowStart + 1 },
		(_, index) => pageWindowStart + index,
	);

	const confirmAction = async () => {
		if (confirmModal.action === "create") {
			const created = await addFaq();
			if (created) {
				closeConfirmModal();
			}
			return;
		}

		if (confirmModal.action === "edit" && confirmModal.faqId) {
			const saved = await saveEdit(confirmModal.faqId);
			if (saved) {
				closeConfirmModal();
			}
			return;
		}

		if (confirmModal.action === "delete" && confirmModal.faqId) {
			deleteFaq(confirmModal.faqId);
		}
	};

	return (
		<section className="w-full max-w-6xl mx-auto px-6 py-10 space-y-6">
			{showGlobalError && (
				<p className="text-red-700 font-medium">{errorMessage}</p>
			)}
			{isAdding ? (
				<div className="rounded-xl bg-white shadow-md p-5 space-y-3">
					{errorMessage && (
						<p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{errorMessage}
						</p>
					)}
					<input
						type="text"
						value={question}
						onChange={(event) => {
							setQuestion(event.target.value);
							if (errorMessage) {
								setErrorMessage("");
							}
						}}
						placeholder="Question"
						className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#556B2F]/50"
					/>
					<textarea
						value={answer}
						onChange={(event) => {
							setAnswer(event.target.value);
							if (errorMessage) {
								setErrorMessage("");
							}
						}}
						placeholder="Answer"
						rows={4}
						className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#556B2F]/50"
					/>
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={openCreateConfirmModal}
							className="rounded-md bg-[#556B2F] px-4 py-2 text-base font-semibold text-white hover:bg-[#6b8e23]"
						>
							Create FAQs
						</button>
						<button
							type="button"
							onClick={() => {
								setIsAdding(false);
								setQuestion("");
								setAnswer("");
								setErrorMessage("");
							}}
							className="rounded-md bg-red-700 px-4 py-2 text-base font-semibold text-white hover:bg-red-800"
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<div className="flex justify-end">
					<button
						type="button"
						onClick={() => setIsAdding(true)}
						className="rounded-md bg-[#556B2F] px-4 py-2 text-base font-semibold text-white hover:bg-[#6b8e23]"
					>
						Create FAQs
					</button>
				</div>
			)}

			{isLoading ? (
				[0, 1, 2, 3, 4].map((index) => (
					<div key={index} className="flex items-center gap-3">
						<div className="flex-1 rounded-2xl border border-gray-300 bg-[#f3f4f6] px-6 py-4 shadow-sm">
							<Skeleton className="h-6 w-2/3" />
						</div>
						<div className="flex shrink-0 flex-row gap-2">
							<Skeleton className="h-9 w-16" />
							<Skeleton className="h-9 w-16" />
						</div>
					</div>
				))
			) : faqs.length === 0 ? (
				<p className="text-gray-700">No FAQs found.</p>
			) : (
				faqs.map((faq) => (
					<FaqsCard
						key={faq.id}
						question={faq.question}
						answer={faq.answer}
						onEdit={() => startEdit(faq)}
						onDelete={() => openDeleteConfirmModal(faq.id)}
						isEditing={editingId === faq.id}
						editQuestion={editQuestion}
						editAnswer={editAnswer}
						onChangeEditQuestion={(value) => {
							setEditQuestion(value);
							if (errorMessage) {
								setErrorMessage("");
							}
						}}
						onChangeEditAnswer={(value) => {
							setEditAnswer(value);
							if (errorMessage) {
								setErrorMessage("");
							}
						}}
						editErrorMessage={
							editingId === faq.id ? errorMessage : ""
						}
						onSave={() => openEditConfirmModal(faq.id)}
						onCancel={cancelEdit}
					/>
				))
			)}

			{!isLoading && pagination.pageCount > 1 && (
				<nav
					className="flex flex-wrap items-center justify-center gap-3 pt-2 text-sm"
					aria-label="Admin FAQs pagination"
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
						const isActive = pageNumber === pagination.page;
						const showComma = index < visiblePageNumbers.length - 1;

						return (
							<span
								key={pageNumber}
								className="flex items-center gap-0"
							>
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

			{confirmModal.isOpen && (
				<div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
						<h3 className="text-lg font-bold text-gray-800">
							{confirmModal.action === "create"
								? `Are you sure you want to create "${createFaqQuestion}"?`
								: confirmModal.action === "edit"
									? `Are you sure you want to save changes to "${editFaqQuestion}"?`
									: `Are you sure you want to delete "${selectedFaqQuestion}"?`}
						</h3>

						<div className="mt-6 flex justify-end gap-2">
							<button
								type="button"
								onClick={closeConfirmModal}
								className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={confirmAction}
								className={`rounded-md px-3 py-2 text-sm font-semibold text-white ${
									confirmModal.action === "create" ||
									confirmModal.action === "edit"
										? "bg-[#556B2F] hover:bg-[#6b8e23]"
										: "bg-red-700 hover:bg-red-800"
								}`}
							>
								{confirmModal.action === "create"
									? "Create"
									: confirmModal.action === "edit"
										? "Save"
										: "Delete"}
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
