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
				sponsorLink AS link,
				sponsorImageUrl AS imageUrl,
				LOWER(sponsorStatus) AS status
			FROM SponsorInfo
            ORDER BY sponsorName ASC
        `);

		const [eventRows] = await pool.query(`
			SELECT se.sponsorId, e.eventId, e.title
			FROM SponsorEvents se
			JOIN Events e ON e.eventId = se.eventId
		`);

		const eventsBySponsorId = {};
		for (const row of eventRows) {
			if (!eventsBySponsorId[row.sponsorId]) eventsBySponsorId[row.sponsorId] = [];
			eventsBySponsorId[row.sponsorId].push({ id: row.eventId, title: row.title });
		}

		const result = rows.map((row) => ({
			...row,
			events: eventsBySponsorId[row.id] || [],
		}));

		return NextResponse.json(result);
	} catch (err) {
		console.error("[GET /api/sponsors]", err.message);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		const id = `sp_${Date.now()}`;
		const name = (body.name || "").trim();
		const description = (body.description || "").trim();
		const link = (body.link || "").trim();
		const imageUrl = (body.imageUrl || "").trim();
		const status = toDbSponsorStatus(body.status || "current");
		const eventIds = Array.isArray(body.eventIds)
			? [...new Set(body.eventIds)]
			: [];

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
			`INSERT INTO SponsorInfo (sponsorId, sponsorName, sponsorDescription, sponsorLink, sponsorImageUrl, sponsorStatus)
             VALUES (?, ?, ?, ?, ?, ?)`,
			[id, name, description, link || null, imageUrl || null, status],
		);

		if (eventIds.length > 0) {
			await pool.query(
				`INSERT INTO SponsorEvents (sponsorId, eventId) VALUES ${eventIds.map(() => "(?, ?)").join(", ")}`,
				eventIds.flatMap((eventId) => [id, eventId]),
			);
		}

		return NextResponse.json(
			{ id, name, description, link, imageUrl, status: status.toLowerCase() },
			{ status: 201 },
		);
	} catch (err) {
		console.error("[POST /api/sponsors]", err.message);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}