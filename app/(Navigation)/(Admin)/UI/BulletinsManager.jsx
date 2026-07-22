"use client";

import React from "react";
import { BulletinCard } from "./BulletinsCard.jsx";
import { Skeleton } from "@/app/_components/Skeleton";

const PAGE_LIMIT = 5;

function normalizePublishedFlag(value) {
	return value === true || value === 1 || value === "1";
}

function sortBulletins(items) {
	return [...items].sort((left, right) => {
		const leftDate = new Date(
			left.createdAt || left.updatedAt || 0,
		).getTime();
		const rightDate = new Date(
			right.createdAt || right.updatedAt || 0,
		).getTime();

		if (rightDate !== leftDate) {
			return rightDate - leftDate;
		}

		return Number(right.bulletinId || 0) - Number(left.bulletinId || 0);
	});
}

function getBulletinValidationError(titleValue, bodyValue) {
	const trimmedTitle = String(titleValue || "").trim();
	const trimmedBody = String(bodyValue || "").trim();

	if (!trimmedTitle || !trimmedBody) {
		return "Title and body are required.";
	}

	return "";
}

function mapBulletinRecord(record) {
	return {
		bulletinId: record.bulletinId,
		title: record.title,
		body: record.body,
		publishDate: record.publishDate || null,
		createdAt: record.createdAt || null,
		updatedAt: record.updatedAt || null,
		isPublished: normalizePublishedFlag(record.isPublished),
	};
}

export function BulletinManager() {
	const [bulletins, setBulletins] = React.useState([]);
	const [currentPage, setCurrentPage] = React.useState(1);
	const [pagination, setPagination] = React.useState({
		page: 1,
		pageCount: 1,
		hasPrevPage: false,
		hasNextPage: false,
	});
	const [title, setTitle] = React.useState("");
	const [body, setBody] = React.useState("");
	const [editingId, setEditingId] = React.useState(null);
	const [editTitle, setEditTitle] = React.useState("");
	const [editBody, setEditBody] = React.useState("");
	const [editIsPublished, setEditIsPublished] = React.useState(false);
	const [isAdding, setIsAdding] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(true);
	const [errorMessage, setErrorMessage] = React.useState("");
	const [confirmModal, setConfirmModal] = React.useState({
		isOpen: false,
		action: null,
		bulletinId: null,
	});

	const loadBulletins = React.useCallback(
		async (pageToLoad = currentPage) => {
			try {
				setIsLoading(true);
				setErrorMessage("");
				const searchParams = new URLSearchParams({
					page: String(pageToLoad),
					limit: String(PAGE_LIMIT),
					published: "all",
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

				const rows = Array.isArray(data)
					? data
					: Array.isArray(data.data)
						? data.data
						: [];

				const meta = data.pagination || {};
				const page = Number(meta.page) || 1;
				const pageCount = Math.max(1, Number(meta.pageCount) || 1);

				setBulletins(sortBulletins(rows.map(mapBulletinRecord)));
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
				setErrorMessage(error.message || "Failed to load bulletins");
			} finally {
				setIsLoading(false);
			}
		},
		[currentPage],
	);

	React.useEffect(() => {
		loadBulletins(currentPage);
	}, [currentPage, loadBulletins]);

	const resetCreateForm = () => {
		setTitle("");
		setBody("");
	};

	const resetEditForm = () => {
		setEditingId(null);
		setEditTitle("");
		setEditBody("");
		setEditIsPublished(false);
	};

	const addBulletin = async () => {
		const trimmedTitle = title.trim();
		const trimmedBody = body.trim();
		const validationError = getBulletinValidationError(
			trimmedTitle,
			trimmedBody,
		);

		if (validationError) {
			setErrorMessage(validationError);
			return false;
		}

		try {
			setErrorMessage("");
			const response = await fetch("/api/bulletins", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: trimmedTitle,
					body: trimmedBody,
					isPublished: false,
				}),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to add bulletin");
			}

			await loadBulletins(1);
			setCurrentPage(1);
			resetCreateForm();
			setIsAdding(false);
			return true;
		} catch (error) {
			setErrorMessage(error.message || "Failed to add bulletin");
			return false;
		}
	};

	const startEdit = (bulletin) => {
		setEditingId(bulletin.bulletinId);
		setEditTitle(bulletin.title || "");
		setEditBody(bulletin.body || "");
		setEditIsPublished(normalizePublishedFlag(bulletin.isPublished));
	};

	const saveEdit = async (id) => {
		const trimmedTitle = editTitle.trim();
		const trimmedBody = editBody.trim();
		const validationError = getBulletinValidationError(
			trimmedTitle,
			trimmedBody,
		);

		if (validationError) {
			setErrorMessage(validationError);
			return false;
		}

		try {
			setErrorMessage("");
			const response = await fetch(`/api/bulletins/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: trimmedTitle,
					body: trimmedBody,
					isPublished: editIsPublished,
				}),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to update bulletin");
			}

			await loadBulletins(currentPage);
			resetEditForm();
			return true;
		} catch (error) {
			setErrorMessage(error.message || "Failed to update bulletin");
			return false;
		}
	};

	const cancelEdit = () => {
		resetEditForm();
		setErrorMessage("");
	};

	const openDeleteConfirmModal = (id) => {
		setConfirmModal({
			isOpen: true,
			action: "delete",
			bulletinId: id,
		});
	};

	const openCreateConfirmModal = () => {
		const validationError = getBulletinValidationError(title, body);

		if (validationError) {
			setErrorMessage(validationError);
			return;
		}

		setConfirmModal({
			isOpen: true,
			action: "create",
			bulletinId: null,
		});
	};

	const openEditConfirmModal = (id) => {
		const validationError = getBulletinValidationError(editTitle, editBody);

		if (validationError) {
			setErrorMessage(validationError);
			return;
		}

		setConfirmModal({
			isOpen: true,
			action: "edit",
			bulletinId: id,
		});
	};

	const openPublishConfirmModal = (id, nextIsPublished) => {
		setConfirmModal({
			isOpen: true,
			action: nextIsPublished ? "publish" : "unpublish",
			bulletinId: id,
		});
	};

	const publishBulletin = async (id, nextIsPublished) => {
		try {
			setErrorMessage("");
			const bulletin = bulletins.find((item) => item.bulletinId === id);

			if (!bulletin) {
				setErrorMessage("Bulletin not found.");
				return;
			}

			const response = await fetch(`/api/bulletins/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: bulletin.title,
					body: bulletin.body,
					isPublished: nextIsPublished,
					preserveUpdatedAt: true,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.error || "Failed to update bulletin status",
				);
			}

			await loadBulletins(currentPage);
			return true;
		} catch (error) {
			setErrorMessage(
				error.message || "Failed to update bulletin status",
			);
			return false;
		}
	};

	const closeConfirmModal = () => {
		const shouldClearFormError =
			confirmModal.action === "create" || confirmModal.action === "edit";

		setConfirmModal({
			isOpen: false,
			action: null,
			bulletinId: null,
		});

		if (shouldClearFormError) {
			setErrorMessage("");
		}
	};

	const deleteBulletin = async (id) => {
		try {
			setErrorMessage("");
			const response = await fetch(`/api/bulletins/${id}`, {
				method: "DELETE",
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to delete bulletin");
			}

			await loadBulletins(currentPage);
			if (editingId === id) {
				cancelEdit();
			}
			closeConfirmModal();
		} catch (error) {
			setErrorMessage(error.message || "Failed to delete bulletin");
		}
	};

	const selectedBulletinTitle =
		bulletins.find(
			(bulletin) => bulletin.bulletinId === confirmModal.bulletinId,
		)?.title || "this bulletin";
	const createBulletinTitle = title.trim() || "this bulletin";
	const editBulletinTitle = editTitle.trim() || "this bulletin";
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
			const created = await addBulletin();
			if (created) {
				closeConfirmModal();
			}
			return;
		}

		if (confirmModal.action === "edit" && confirmModal.bulletinId) {
			const saved = await saveEdit(confirmModal.bulletinId);
			if (saved) {
				closeConfirmModal();
			}
			return;
		}

		if (
			(confirmModal.action === "publish" ||
				confirmModal.action === "unpublish") &&
			confirmModal.bulletinId
		) {
			const nextIsPublished = confirmModal.action === "publish";
			const saved = await publishBulletin(
				confirmModal.bulletinId,
				nextIsPublished,
			);
			if (saved) {
				closeConfirmModal();
			}
			return;
		}

		if (confirmModal.action === "delete" && confirmModal.bulletinId) {
			deleteBulletin(confirmModal.bulletinId);
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
						value={title}
						onChange={(event) => {
							setTitle(event.target.value);
							if (errorMessage) {
								setErrorMessage("");
							}
						}}
						placeholder="Title"
						className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#556B2F]/50"
					/>
					<textarea
						value={body}
						onChange={(event) => {
							setBody(event.target.value);
							if (errorMessage) {
								setErrorMessage("");
							}
						}}
						placeholder="Body"
						rows={6}
						className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#556B2F]/50"
					/>
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={openCreateConfirmModal}
							className="rounded-md bg-[#556B2F] px-4 py-2 text-base font-semibold text-white hover:bg-[#6b8e23]"
						>
							Create Post
						</button>
						<button
							type="button"
							onClick={() => {
								setIsAdding(false);
								resetCreateForm();
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
						Create Post
					</button>
				</div>
			)}

			{isLoading ? (
				[0, 1, 2].map((index) => (
					<div
						key={index}
						className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
					>
						<div className="flex flex-col gap-6 p-6 md:p-8">
							<Skeleton className="h-6 w-20 rounded-full" />
							<Skeleton className="h-9 w-2/3" />
							<div className="flex flex-col gap-2">
								<Skeleton className="h-5 w-full" />
								<Skeleton className="h-5 w-full" />
								<Skeleton className="h-5 w-1/2" />
							</div>
						</div>
					</div>
				))
			) : bulletins.length === 0 ? (
				<p className="text-gray-700">No bulletins found.</p>
			) : (
				<>
					{bulletins.map((bulletin) => (
						<BulletinCard
							key={bulletin.bulletinId}
							title={bulletin.title}
							body={bulletin.body}
							publishDate={bulletin.publishDate}
							createdAt={bulletin.createdAt}
							updatedAt={bulletin.updatedAt}
							isPublished={bulletin.isPublished}
							onEdit={() => startEdit(bulletin)}
							onDelete={() =>
								openDeleteConfirmModal(bulletin.bulletinId)
							}
							isEditing={editingId === bulletin.bulletinId}
							editTitle={editTitle}
							editBody={editBody}
							editIsPublished={editIsPublished}
							onPublish={() =>
								openPublishConfirmModal(
									bulletin.bulletinId,
									!bulletin.isPublished,
								)
							}
							onChangeEditTitle={(value) => {
								setEditTitle(value);
								if (errorMessage) {
									setErrorMessage("");
								}
							}}
							onChangeEditBody={(value) => {
								setEditBody(value);
								if (errorMessage) {
									setErrorMessage("");
								}
							}}
							editErrorMessage={
								editingId === bulletin.bulletinId
									? errorMessage
									: ""
							}
							onSave={() =>
								openEditConfirmModal(bulletin.bulletinId)
							}
							onCancel={cancelEdit}
						/>
					))}

					{pagination.pageCount > 1 && (
						<nav
							className="flex flex-wrap items-center justify-center gap-3 pt-2 text-sm"
							aria-label="Admin bulletins pagination"
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
								const isActive = pageNumber === pagination.page;
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
												isActive ? "page" : undefined
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
				</>
			)}

			{confirmModal.isOpen && (
				<div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
						<h3 className="text-lg font-bold text-gray-800">
							{confirmModal.action === "create"
								? `Are you sure you want to create "${createBulletinTitle}"?`
								: confirmModal.action === "edit"
									? `Are you sure you want to save changes to "${editBulletinTitle}"?`
									: confirmModal.action === "publish"
										? `Are you sure you want to publish "${selectedBulletinTitle}"?`
										: confirmModal.action === "unpublish"
											? `Are you sure you want to unpublish "${selectedBulletinTitle}"?`
											: `Are you sure you want to delete "${selectedBulletinTitle}"?`}
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
									confirmModal.action === "edit" ||
									confirmModal.action === "publish" ||
									confirmModal.action === "unpublish"
										? "bg-[#556B2F] hover:bg-[#6b8e23]"
										: "bg-red-700 hover:bg-red-800"
								}`}
							>
								{confirmModal.action === "create"
									? "Create"
									: confirmModal.action === "edit"
										? "Save"
										: confirmModal.action === "publish"
											? "Publish"
											: confirmModal.action ===
												  "unpublish"
												? "Unpublish"
												: "Delete"}
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}

export function BulletinsManager() {
	return <BulletinManager />;
}
