"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, X, Link2, Upload, CalendarDays } from "lucide-react";
import FeaturedSponsorCard from "./FeaturedSponsorCard";
import OverTheYearsSponsorCard from "./OverTheYearsSponsorCard";

const FEATURED_SPONSOR_LIMIT = 5;
const FEATURED_LIMIT_REACHED_MESSAGE =
	"Featured limit is reached. Move one to Over the Years first.";

export function SponsorsManager() {
	const [currentSponsors, setCurrentSponsors] = useState([]);
	const [previousSponsors, setPreviousSponsors] = useState([]);
	const [isAddSponsorModalOpen, setIsAddSponsorModalOpen] = useState(false);
	const [editingSponsorId, setEditingSponsorId] = useState(null);

	const [confirmModal, setConfirmModal] = useState({
		isOpen: false,
		action: null, // "delete" | "move" | "add"
		sponsorId: null,
	});

	const [newSponsor, setNewSponsor] = useState({
		name: "",
		description: "",
		link: "",
		imageUrl: "",
		eventIds: [],
	});
	const [formError, setFormError] = useState("");

	const [events, setEvents] = useState([]);
	const [imageFile, setImageFile] = useState(null);
	const [imagePreviewUrl, setImagePreviewUrl] = useState("");
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		if (!imageFile) { setImagePreviewUrl(""); return; }
		const url = URL.createObjectURL(imageFile);
		setImagePreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [imageFile]);

	const displayImage = imagePreviewUrl || newSponsor.imageUrl;

	const handleImageFiles = (files) => {
		const file = files?.[0];
		if (file && file.type.startsWith("image/")) setImageFile(file);
	};
	const handleDragOver = (event) => { event.preventDefault(); setIsDragging(true); };
	const handleDragLeave = (event) => { event.preventDefault(); setIsDragging(false); };
	const handleImageDrop = (event) => {
		event.preventDefault();
		setIsDragging(false);
		handleImageFiles(event.dataTransfer.files);
	};
	const handleRemoveImage = () => {
		setImageFile(null);
		setNewSponsor((previous) => ({ ...previous, imageUrl: "" }));
	};

	const toggleEventId = (eventId) => {
		setNewSponsor((previous) => {
			const eventIds = previous.eventIds.includes(eventId)
				? previous.eventIds.filter((id) => id !== eventId)
				: [...previous.eventIds, eventId];
			return { ...previous, eventIds };
		});
	};

	const loadEvents = useCallback(async () => {
		try {
			const res = await fetch("/api/events", { cache: "no-store" });
			const json = await res.json();
			if (json.success) setEvents(json.data);
		} catch (error) {
			console.error(error);
		}
	}, []);

	const selectedSponsorName =
		currentSponsors.find((sponsor) => sponsor.id === confirmModal.sponsorId)
			?.name ||
		previousSponsors.find(
			(sponsor) => sponsor.id === confirmModal.sponsorId,
		)?.name ||
		"this sponsor";

	const handleSponsorFieldChange = (event) => {
		const { name, value } = event.target;
		setFormError("");
		setNewSponsor((previous) => ({
			...previous,
			[name]: value,
		}));
	};

	const getSponsorValidationError = (sponsorDraft) => {
		const name = sponsorDraft.name.trim();
		const description = sponsorDraft.description.trim();

		if (!name) {
			return "Sponsor name is required.";
		}

		if (!description) {
			return "Description is required.";
		}

		return "";
	};

	const closeAddSponsorModal = () => {
		setIsAddSponsorModalOpen(false);
		setEditingSponsorId(null);
		setFormError("");
		setImageFile(null);
		setNewSponsor({
			name: "",
			description: "",
			link: "",
			imageUrl: "",
			eventIds: [],
		});
	};

	const openConfirmModal = (action, sponsorId) => {
		setConfirmModal({ isOpen: true, action, sponsorId });
	};

	const closeConfirmModal = () => {
		setConfirmModal({ isOpen: false, action: null, sponsorId: null });
	};

	const executeConfirmedAction = async () => {
		const { action, sponsorId } = confirmModal;
		if (!action || (!sponsorId && action !== "add")) return;

		try {
			let response;

			if (action === "delete") {
				response = await fetch(`/api/sponsors/${sponsorId}`, {
					method: "DELETE",
				});
			} else if (action === "move") {
				response = await fetch(`/api/sponsors/${sponsorId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: "previous" }),
				});
			} else if (action === "add") {
				const isEdit = Boolean(editingSponsorId);
				const url = isEdit
					? `/api/sponsors/${editingSponsorId}`
					: "/api/sponsors";

				let imageUrl = newSponsor.imageUrl;
				if (imageFile) {
					const uploadForm = new FormData();
					uploadForm.append("file", imageFile);
					const uploadRes = await fetch("/api/sponsors/upload", {
						method: "POST",
						body: uploadForm,
					});
					const uploadJson = await uploadRes.json();
					if (!uploadJson.success) {
						setFormError(uploadJson.error || "Image upload failed.");
						return;
					}
					imageUrl = uploadJson.url;
				}

				response = await fetch(url, {
					method: isEdit ? "PUT" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: newSponsor.name.trim(),
						description: newSponsor.description.trim(),
						link: newSponsor.link.trim(),
						imageUrl,
						eventIds: newSponsor.eventIds,
						status: "current",
					}),
				});
			}

			if (!response?.ok) {
				const errorText = (await response?.text()) || "";
				let parsedMessage = "";

				try {
					const parsed = JSON.parse(errorText);
					parsedMessage = parsed?.error || "";
				} catch {
					parsedMessage = errorText;
				}

				if (action === "add") {
					setFormError(parsedMessage || "Unable to save sponsor.");
				}

				console.error(`${action} failed:`, response?.status, errorText);
				return;
			}

			closeConfirmModal();
			if (action === "add") {
				closeAddSponsorModal();
			}
			loadSponsors();
		} catch (error) {
			console.error(error);
		}
	};

	const handleDeleteCurrentSponsor = async (sponsorId) => {
		openConfirmModal("delete", sponsorId);
	};

	const handleDeletePreviousSponsor = async (sponsorId) => {
		openConfirmModal("delete", sponsorId);
	};

	const handleMoveToPrevious = async (sponsorId) => {
		openConfirmModal("move", sponsorId);
	};

	const handleEditCurrentSponsor = (sponsorId) => {
		const sponsorToEdit = currentSponsors.find(
			(sponsor) => sponsor.id === sponsorId,
		);

		if (!sponsorToEdit) {
			return;
		}

		setEditingSponsorId(sponsorId);
		setFormError("");
		setImageFile(null);
		setNewSponsor({
			name: sponsorToEdit.name,
			description: sponsorToEdit.description || "",
			link: sponsorToEdit.link || "",
			imageUrl: sponsorToEdit.imageUrl || "",
			eventIds: (sponsorToEdit.events || []).map((event) => event.id),
		});
		setIsAddSponsorModalOpen(true);
	};

	const handleAddSponsor = async (event) => {
		event.preventDefault();
		if (!newSponsor.name.trim()) return;

		const validationError = getSponsorValidationError(newSponsor);
		if (validationError) {
			setFormError(validationError);
			return;
		}

		openConfirmModal("add", null);
	};

	const loadSponsors = useCallback(async () => {
		try {
			const res = await fetch("/api/sponsors", {
				cache: "no-store",
			});
			if (!res.ok) {
				console.error("Load failed:", await res.text());
				return;
			}

			const raw = await res.json();

			const allSponsors = raw.map((s) => ({
				id: s.id ?? s.sponsorId,
				name: s.name ?? s.sponsorName ?? "",
				description: s.description ?? s.sponsorDescription ?? "",
				link: s.link ?? "",
				imageUrl: s.imageUrl ?? "",
				events: s.events ?? [],
				status: s.status ?? s.sponsorStatus ?? "current",
			}));

			setCurrentSponsors(
				allSponsors.filter((s) => s.status === "current"),
			);
			setPreviousSponsors(
				allSponsors.filter((s) => s.status === "previous"),
			);
		} catch (error) {
			console.error(error);
		}
	}, []);

	useEffect(() => {
		loadSponsors();
	}, [loadSponsors]);

	useEffect(() => {
		loadEvents();
	}, [loadEvents]);

	return (
		<div className="min-h-screen bg-[#f0ece1] flex flex-col font-sans">
			<main className="flex-1 flex flex-col items-center py-12 px-6 md:px-8">
				{/* Current Sponsors Section */}
				<section className="w-full max-w-7xl mb-16">
					<div className="flex items-center justify-center gap-3 mb-8">
						<h2 className="text-2xl md:text-3xl font-bold text-[#2a2420]">
							Featured
						</h2>
						<button
							type="button"
							aria-label="Create featured sponsor"
							className="ml-auto rounded-md bg-[#556B2F] px-4 py-2 text-base font-semibold text-white hover:bg-[#6b8e23] focus:outline-none"
							onClick={() => setIsAddSponsorModalOpen(true)}
						>
							Create Sponsor
						</button>
					</div>

					<div className="flex flex-col gap-8 items-center">
						{currentSponsors.map((sponsor) => (
							<FeaturedSponsorCard
								key={sponsor.id}
								sponsor={sponsor}
								onDelete={handleDeleteCurrentSponsor}
								onEdit={handleEditCurrentSponsor}
								onMoveToPrevious={handleMoveToPrevious}
							/>
						))}
					</div>
				</section>

				{/* Divider */}
				<div className="w-full max-w-7xl h-px bg-[#556B2F] mb-16"></div>

				{/* Previous Sponsors Section */}
				<section className="w-full max-w-7xl mb-16">
					<h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-[#2a2420]">
						Over the Years
					</h2>
					<div className="flex flex-wrap justify-center gap-6">
						{previousSponsors.map((sponsor) => (
							<OverTheYearsSponsorCard
								key={sponsor.id}
								sponsor={sponsor}
								onDelete={handleDeletePreviousSponsor}
							/>
						))}
					</div>
				</section>

				{isAddSponsorModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
						<div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
							<div className="relative mb-4">
								<h3 className="text-center text-xl font-bold text-gray-800">
									{editingSponsorId
										? "Edit Sponsor"
										: "Featured Sponsor"}
								</h3>
								<button
									type="button"
									onClick={closeAddSponsorModal}
									className="absolute right-0 top-0 text-gray-600 hover:text-gray-800"
									aria-label="Close modal"
								>
									<X size={18} strokeWidth={2.5} />
								</button>
							</div>

							<form
								onSubmit={handleAddSponsor}
								className="flex flex-col gap-6"
							>
								{formError && (
									<p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
										{formError}
									</p>
								)}
								<div className="mx-auto flex flex-col items-center gap-2">
									{!displayImage ? (
										<label
											onDragOver={handleDragOver}
											onDragLeave={handleDragLeave}
											onDrop={handleImageDrop}
											className={`flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-center cursor-pointer transition ${
												isDragging ? "border-[#556B2F] bg-[#f0f5e8]" : "border-gray-300 hover:border-[#556B2F]"
											}`}
										>
											<Upload size={20} className="text-gray-400" />
											<span className="px-2 text-xs text-gray-500">Drag & drop, or click to browse</span>
											<input
												type="file"
												accept="image/*"
												className="hidden"
												onChange={(event) => handleImageFiles(event.target.files)}
											/>
										</label>
									) : (
										<div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-2 border-gray-300 bg-gray-200">
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img src={displayImage} alt="Sponsor logo" className="h-full w-full object-contain" />
											<button
												type="button"
												onClick={handleRemoveImage}
												className="absolute top-1 right-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
												aria-label="Remove image"
											>
												<X size={14} className="text-gray-700" />
											</button>
										</div>
									)}
									<p className="text-xs text-gray-400">Uploads on save. Max 5MB.</p>
								</div>

								<div className="space-y-4">
									<div>
										<label
											htmlFor="name"
											className="mb-1 block text-sm font-semibold text-gray-700"
										>
											Sponsor Name
										</label>
										<input
											id="name"
											name="name"
											type="text"
											value={newSponsor.name}
											onChange={handleSponsorFieldChange}
											required
											className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:outline-none focus:ring-2 focus:ring-[#556B2F]/50"
										/>
									</div>

									<div>
										<label
											htmlFor="description"
											className="mb-1 block text-sm font-semibold text-gray-700"
										>
											Description:
										</label>
										<textarea
											id="description"
											name="description"
											rows={4}
											value={newSponsor.description}
											onChange={handleSponsorFieldChange}
											className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:outline-none focus:ring-2 focus:ring-[#556B2F]/50"
										/>
									</div>

									<div>
										<label
											htmlFor="link"
											className="mb-1 flex items-center gap-1 text-sm font-semibold text-gray-700"
										>
											<Link2 size={14} /> Link
										</label>
										<input
											id="link"
											name="link"
											type="url"
											placeholder="https://example.com"
											value={newSponsor.link}
											onChange={handleSponsorFieldChange}
											className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:outline-none focus:ring-2 focus:ring-[#556B2F]/50"
										/>
									</div>

									<div>
										<label className="mb-1 flex items-center gap-1 text-sm font-semibold text-gray-700">
											<CalendarDays size={14} /> Events Sponsored
										</label>
										<div className="max-h-36 overflow-y-auto rounded-md border border-gray-300 p-2">
											{events.length === 0 ? (
												<p className="text-sm text-gray-400">No events available.</p>
											) : (
												events.map((event) => (
													<label
														key={event.eventId}
														className="flex items-center gap-2 py-1 text-sm text-gray-700"
													>
														<input
															type="checkbox"
															checked={newSponsor.eventIds.includes(event.eventId)}
															onChange={() => toggleEventId(event.eventId)}
														/>
														{event.title}
													</label>
												))
											)}
										</div>
									</div>

									<div className="flex justify-end">
										<button
											type="submit"
											className="rounded-md bg-[#556B2F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6b8e23]"
										>
											{editingSponsorId
												? "Save Changes"
												: "Create"}
										</button>
									</div>
								</div>
							</form>
						</div>
					</div>
				)}

				{confirmModal.isOpen && (
					<div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
						<div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
							<h3 className="text-lg font-bold text-gray-800">
								{confirmModal.action === "delete"
									? `Are you sure you want to delete "${selectedSponsorName}"?`
									: confirmModal.action === "move"
										? `Are you sure you want to move "${selectedSponsorName}" to over the years?`
										: confirmModal.action === "add"
											? `${editingSponsorId ? `Are you sure you want to save changes to "${newSponsor.name.trim()}"?` : `Do you want to create "${newSponsor.name.trim()}"?`}`
											: "Confirm action?"}
							</h3>

							<div className="mt-6 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => {
										closeConfirmModal();
										if (confirmModal.action === "add") {
											closeAddSponsorModal();
										}
									}}
									className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={() => {
										executeConfirmedAction();
									}}
									className={`rounded-md px-3 py-2 text-sm font-semibold text-white ${
										confirmModal.action === "delete"
											? "bg-red-700 hover:bg-red-800"
											: confirmModal.action === "add"
												? "bg-[#556B2F] hover:bg-[#6b8e23]"
												: "bg-gray-700 hover:bg-gray-800"
									} `}
								>
									{confirmModal.action === "delete"
										? "Delete"
										: confirmModal.action === "add"
											? editingSponsorId
												? "Save"
												: "Create"
											: "Move"}
								</button>
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
