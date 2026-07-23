export const dynamic = 'force-dynamic';

import pool from "@/lib/db";
import { NextResponse } from "next/server";
import {
	shouldRejectForModeration,
	getModerationErrorMessage, 
} from "@/app/_utils/moderationHelpers";

function toDbSponsorStatus(value) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (normalized === "current") return "Current";
	if (normalized === "previous") return "Previous";
	return null;
}

async function getSponsorModerationError(name, description) {
	const nameResult = await shouldRejectForModeration("name", name);
	if (nameResult.shouldReject) {
		return getModerationErrorMessage(nameResult);
	}

	const descriptionResult = await shouldRejectForModeration(
		"description",
		description,
	);
	if (descriptionResult.shouldReject) {
		return getModerationErrorMessage(descriptionResult);
	}

	return "";
}

export async function PUT(request, { params }) {
	try {
		const { id } = await params;
		const body = await request.json();
		const fields = [];
		const values = [];

		if (body.name !== undefined) {
			const name = body.name.trim();
			if (!name) {
				return NextResponse.json({ error: "Name is required" }, { status: 400 });
			}
			const moderationError = await getSponsorModerationError(name, body.description ?? "");
			if (moderationError) {
				return NextResponse.json({ error: moderationError }, { status: 400 });
			}
			fields.push("sponsorName = ?");
			values.push(name);
		}

		if (body.description !== undefined) {
			fields.push("sponsorDescription = ?");
			values.push(body.description.trim());
		}

		if (body.status !== undefined) {
			const status = toDbSponsorStatus(body.status);
			if (!status) {
				return NextResponse.json(
					{ error: "Status must be Current or Previous" },
					{ status: 400 },
				);
			}
			fields.push("sponsorStatus = ?");
			values.push(status);
		}

		if (body.link !== undefined) {
			fields.push("sponsorLink = ?");
			values.push(body.link.trim() || null);
		}

		if (body.imageUrl !== undefined) {
			fields.push("sponsorImageUrl = ?");
			values.push(body.imageUrl.trim() || null);
		}

		if (fields.length > 0) {
			values.push(id);
			const [result] = await pool.query(
				`UPDATE SponsorInfo SET ${fields.join(", ")} WHERE sponsorId = ?`,
				values,
			);

			if (result.affectedRows === 0) {
				return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
			}
		}

		if (body.eventIds !== undefined) {
			const eventIds = Array.isArray(body.eventIds)
				? [...new Set(body.eventIds)]
				: [];
			await pool.query(`DELETE FROM SponsorEvents WHERE sponsorId = ?`, [id]);
			if (eventIds.length > 0) {
				await pool.query(
					`INSERT INTO SponsorEvents (sponsorId, eventId) VALUES ${eventIds.map(() => "(?, ?)").join(", ")}`,
					eventIds.flatMap((eventId) => [id, eventId]),
				);
			}
		}

		if (fields.length === 0 && body.eventIds === undefined) {
			return NextResponse.json({ error: "No fields to update" }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[PUT /api/sponsors/[id]]", err.message);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

export async function DELETE(request, { params }) {
	try {
		const { id } = await params;
		const [result] = await pool.query(
			`DELETE FROM SponsorInfo WHERE sponsorId = ?`,
			[id],
		);
		if (result.affectedRows === 0) {
			return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
		}
		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[DELETE /api/sponsors/[id]]", err.message);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
