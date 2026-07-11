export const dynamic = 'force-dynamic';

import pool from "@/lib/db";
import { NextResponse } from "next/server";
import {
	shouldRejectForModeration,
	getModerationErrorMessage,
} from "@/app/_utils/moderationHelpers"

async function getFaqModerationError(question, answer) {
	const questionResult = await shouldRejectForModeration("question", question);
	if (questionResult.shouldReject) {
		return getModerationErrorMessage(questionResult);
	}

	const answerResult = await shouldRejectForModeration("answer", answer);
	if (answerResult.shouldReject) {
		return getModerationErrorMessage(answerResult);
	}

	return "";
}

export async function PUT(request, context) {
	try {
		const { id } = await context.params;
		const body = await request.json();
		const question = (body.question || "").trim();
		const answer = (body.answer || "").trim();

		if (!question || !answer) {
			return NextResponse.json(
				{ error: "Question and answer are required" },
				{ status: 400 },
			);
		}

		const moderationError = await getFaqModerationError(question, answer);
		if (moderationError) {
			return NextResponse.json(
				{ error: moderationError },
				{ status: 400 },
			);
		}

		const [result] = await pool.query(
			`UPDATE FaqList SET questionTitle = ?, answerContent = ? WHERE questionID = ?`,
			[question, answer, id],
		);

		if (result.affectedRows === 0) {
			return NextResponse.json(
				{ error: "FAQ not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("[PUT /api/faqs/:id]", error.message);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(_request, context) {
	try {
		const { id } = await context.params;

		const [result] = await pool.query(
			`DELETE FROM FaqList WHERE questionID = ?`,
			[id],
		);

		if (result.affectedRows === 0) {
			return NextResponse.json(
				{ error: "FAQ not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("[DELETE /api/faqs/:id]", error.message);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
