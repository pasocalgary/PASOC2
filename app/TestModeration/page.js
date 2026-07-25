"use client";

import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";

export default function TestModerationPage() {
	const [text, setText] = useState("");
	const [checking, setChecking] = useState(false);
	const [result, setResult] = useState(null);
	const [error, setError] = useState("");

	const [imageFile, setImageFile] = useState(null);
	const [imagePreviewUrl, setImagePreviewUrl] = useState("");
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		if (!imageFile) { setImagePreviewUrl(""); return; }
		const url = URL.createObjectURL(imageFile);
		setImagePreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [imageFile]);

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
	const handleRemoveImage = () => setImageFile(null);

	const handleCheck = async () => {
		setChecking(true);
		setError("");
		setResult(null);

		try {
			const res = await fetch("/api/moderate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fields: { currentOrgInvolvement: text } }),
			});
			const data = await res.json();

			if (!res.ok) throw new Error(data.error || "Moderation check failed.");

			setResult(data.moderationErrors.currentOrgInvolvement ?? null);
		} catch (err) {
			setError(err.message);
		} finally {
			setChecking(false);
		}
	};

	return (
		<main className="w-full max-w-2xl mx-auto px-6 py-16 flex flex-col gap-10">
			<h1 className="text-3xl font-bold text-primary-700">Moderation Test</h1>

			<section className="flex flex-col gap-3">
				<label htmlFor="moderation-text" className="font-semibold">
					Text to check
				</label>
				<textarea
					id="moderation-text"
					value={text}
					onChange={(event) => setText(event.target.value)}
					rows={4}
					className="rounded-xl border border-gray-300 p-3 focus:outline-none focus:border-[#556B2F]"
					placeholder="Type something to run through moderation..."
				/>
				<button
					type="button"
					onClick={handleCheck}
					disabled={!text.trim() || checking}
					className="self-start bg-[#556B2F] hover:bg-primary-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-xl transition-all duration-200"
				>
					{checking ? "Checking..." : "Check"}
				</button>

				{error && <p className="text-red-600">{error}</p>}
				{result !== null && !error && (
					result ? (
						<p className="text-red-600">Flagged: {result}</p>
					) : (
						<p className="text-green-700">Passed moderation.</p>
					)
				)}
			</section>

			<section className="flex flex-col gap-3">
				<p className="font-semibold">Image upload (not connected yet)</p>
				<div className="mx-auto flex flex-col items-center gap-2">
					{!imagePreviewUrl ? (
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
							<img src={imagePreviewUrl} alt="Upload preview" className="h-full w-full object-contain" />
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
				</div>
			</section>
		</main>
	);
}
