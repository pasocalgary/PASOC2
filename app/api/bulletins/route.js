export const dynamic = 'force-dynamic';

import pool from "@/lib/db";
import { NextResponse } from "next/server";
import {
	shouldRejectForModeration,
	getModerationErrorMessage,
} from "@/app/_utils/moderationHelpers";

function toIsoString(value) {
	if (!value) {
		return null;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date.toISOString();
}

function normalizePublishedFlag(value) {
	return value === true || value === 1 || value === "1" ? 1 : 0;
}

function getCurrentTimestamp() {
	return new Date();
}

async function getBulletinModerationError(title, body) {
	const titleResult = await shouldRejectForModeration("title", title);
	if (titleResult.shouldReject) {
		return getModerationErrorMessage(titleResult);
	}

	const bodyResult = await shouldRejectForModeration("body", body);
	if (bodyResult.shouldReject) {
		return getModerationErrorMessage(bodyResult);
	}

	return "";
}

function mapBulletinRow(row) {
	const isPublished = Boolean(row.isPublished);

	return {
		bulletinId: row.bulletinId,
		title: row.title,
		body: row.body,
		publishDate: isPublished ? toIsoString(row.publishDate) : null,
		isPublished,
		createdAt: toIsoString(row.createdAt),
		updatedAt: toIsoString(row.updatedAt),
	};
}

function parsePositiveInteger(value, fallback) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return fallback;
	}

	return parsed;
}

function parsePublishedQuery(value) {
	if (value === null || value === undefined || value === "") {
		return { isValid: true, filter: null };
	}

	const normalized = String(value).toLowerCase();

	if (normalized === "all") {
		return { isValid: true, filter: null };
	}

	if (normalized === "true" || normalized === "1") {
		return { isValid: true, filter: 1 };
	}

	if (normalized === "false" || normalized === "0") {
		return { isValid: true, filter: 0 };
	}

	return { isValid: false, filter: null };
}

function getBulletinsWhereClause(publishedFilter) {
	if (publishedFilter === null) {
		return { whereClause: "", params: [] };
	}

	return {
		whereClause: "WHERE isPublished = ?",
		params: [publishedFilter],
	};
}

export async function GET(request) {
	try {
		const { searchParams } = new URL(request.url);
		const requestedPage = parsePositiveInteger(searchParams.get("page"), 1);
		const requestedLimit = parsePositiveInteger(
			searchParams.get("limit"),
			5,
		);
		const limit = Math.min(requestedLimit, 50);
		const publishedQuery = parsePublishedQuery(
			searchParams.get("published"),
		);

		if (!publishedQuery.isValid) {
			return NextResponse.json(
				{
					error: 'Invalid "published" query. Use one of: all, true, false, 1, 0.',
				},
				{ status: 400 },
			);
		}

		const publishedFilter = publishedQuery.filter;
		const { whereClause, params } =
			getBulletinsWhereClause(publishedFilter);

		const [countRows] = await pool.query(
			`SELECT COUNT(*) AS totalCount
			 FROM BulletinList
			 ${whereClause}`,
			params,
		);
		const totalCount = Number(countRows?.[0]?.totalCount || 0);
		const pageCount = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
		const page = Math.min(requestedPage, pageCount);
		const offset = (page - 1) * limit;

		const [rows] = await pool.query(
			`SELECT bulletinId, title, body, publishDate, isPublished, createdAt, updatedAt
			 FROM BulletinList
			 ${whereClause}
			 ORDER BY COALESCE(publishDate, createdAt, updatedAt) DESC, bulletinId DESC
			 LIMIT ? OFFSET ?`,
			[...params, limit, offset],
		);

		return NextResponse.json({
			data: rows.map(mapBulletinRow),
			pagination: {
				page,
				limit,
				totalCount,
				pageCount,
				hasPrevPage: page > 1,
				hasNextPage: page < pageCount,
			},
		});
	} catch (error) {
		console.error("[GET /api/bulletins]", error.message);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		const title = (body.title || "").trim();
		const bulletinBody = (body.body || "").trim();
		const isPublished = normalizePublishedFlag(body.isPublished);
		const now = getCurrentTimestamp();
		const publishDate = isPublished ? now : null;

		if (!title || !bulletinBody) {
			return NextResponse.json(
				{ error: "Title and body are required" },
				{ status: 400 },
			);
		}

		const moderationError = await getBulletinModerationError(title, bulletinBody);
		if (moderationError) {
			return NextResponse.json(
				{ error: moderationError },
				{ status: 400 },
			);
		}

		const insertQuery = `INSERT INTO BulletinList
			 (title, body, publishDate, isPublished, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?)`;
		const insertParams = [
			title,
			bulletinBody,
			publishDate,
			isPublished,
			now,
			now,
		];

		let result;
		try {
			[result] = await pool.query(insertQuery, insertParams);
		} catch (error) {
			const isPublishDateConstraintError =
				!isPublished &&
				error?.code === "ER_BAD_NULL_ERROR" &&
				String(error.message || "").includes("publishDate");

			if (!isPublishDateConstraintError) {
				throw error;
			}

			await pool.query(
				`ALTER TABLE BulletinList
				 MODIFY COLUMN publishDate DATETIME NULL DEFAULT NULL`,
			);
			[result] = await pool.query(insertQuery, insertParams);
		}

		return NextResponse.json(
			{
				bulletinId: result.insertId,
				title,
				body: bulletinBody,
				publishDate: toIsoString(publishDate),
				isPublished: Boolean(isPublished),
				createdAt: toIsoString(now),
				updatedAt: toIsoString(now),
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("[POST /api/bulletins]", error.message);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}