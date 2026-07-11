"use client";

import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import Image from "next/image";
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
	});
	const [formError, setFormError] = useState("");

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
		setNewSponsor({
			name: "",
			description: "",
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

				response = await fetch(url, {
					method: isEdit ? "PUT" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: newSponsor.name.trim(),
						description: newSponsor.description.trim(),
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
		setNewSponsor({
			name: sponsorToEdit.name,
			description: sponsorToEdit.description || "",
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

			const allSponsors = raw.map((s) => ({
				id: s.id ?? s.sponsorId,
				name: s.name ?? s.sponsorName ?? "",
				description: s.description ?? s.sponsorDescription ?? "",
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
	};

	useEffect(() => {
		loadSponsors();
	}, []);

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
								<div className="mx-auto flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-gray-300 bg-gray-200">
									<Image
										src="/pasoc_logo.png"
										alt="PASOC logo placeholder"
										width={96}
										height={96}
										className="object-contain"
									/>
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
