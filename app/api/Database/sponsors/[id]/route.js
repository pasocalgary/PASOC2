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

		if (fields.length === 0) {
			return NextResponse.json({ error: "No fields to update" }, { status: 400 });
		}

		values.push(id);
		const [result] = await pool.query(
			`UPDATE SponsorInfo SET ${fields.join(", ")} WHERE sponsorId = ?`,
			values,
		);

		if (result.affectedRows === 0) {
			return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[PUT /api/Database/sponsors/[id]]", err.message);
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
		console.error("[DELETE /api/Database/sponsors/[id]]", err.message);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

export async function GET() {
	try {
		const [rows] = await pool.query(`
            SELECT
                sponsorId AS id,
                sponsorName AS name,
                sponsorDescription AS description,
				LOWER(sponsorStatus) AS status
			FROM SponsorInfo
            ORDER BY sponsorName ASC
        `);
		return NextResponse.json(rows);
	} catch (err) {
		console.error("[GET /api/Database/sponsors]", err.message);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		const id = `sp_${Date.now()}`;
		const name = (body.name || "").trim();
		const description = (body.description || "").trim();
		const status = toDbSponsorStatus(body.status || "current");

		if (!name) {
			return NextResponse.json(
				{ error: "Name is required" },
				{ status: 400 },
			);
		}

		if (!status) {
			return NextResponse.json(
				{ error: "Status must be Current or Previous" },
				{ status: 400 },
			);
		}

		const moderationError = await getSponsorModerationError(name, description);
		if (moderationError) {
			return NextResponse.json(
				{ error: moderationError },
				{ status: 400 },
			);
		}

		await pool.query(
			`INSERT INTO SponsorInfo (sponsorId, sponsorName, sponsorDescription, sponsorStatus)
             VALUES (?, ?, ?, ?)`,
			[id, name, description, status],
		);

		return NextResponse.json(
			{ id, name, description, status: status.toLowerCase() },
			{ status: 201 },
		);
	} catch (err) {
		console.error("[POST /api/Database/sponsors]", err.message);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
