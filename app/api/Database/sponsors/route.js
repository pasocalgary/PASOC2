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