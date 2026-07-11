export const dynamic = 'force-dynamic';

import pool from "@/lib/db";
import { NextResponse } from "next/server";


export async function GET() {
  try {
    const connection = await pool.getConnection();
    connection.release();

    const [rows] = await pool.query(
      "SELECT * FROM Events ORDER BY eventId DESC"
    );

    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("[GET /api/events]", err.message);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        code: err.code || null,
        hint:
          err.code === "ER_NO_SUCH_TABLE"
            ? "Table does not exist."
            : err.code === "ECONNREFUSED"
              ? "Cannot reach MySQL."
              : "Check server logs.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, startDatetime, description, location } = body;

    if (!title || !startDatetime) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, startDatetime" },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      `INSERT INTO Events (title, startDatetime, description, location)
       VALUES (?, ?, ?, ?)`,
      [title, startDatetime, description || null, location || null]
    );

    return NextResponse.json({
      success: true,
      message: "Event created",
      insertId: result.insertId,
    });
  } catch (err) {
    console.error("[POST /api/events]", err.message);
    return NextResponse.json(
      { success: false, error: err.message, code: err.code || null },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, startDatetime, description, location } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required field: id" },
        { status: 400 }
      );
    }

    const fields = [];
    const values = [];

    if (title !== undefined) { fields.push("title = ?"); values.push(title); }
    if (startDatetime !== undefined) { fields.push("startDatetime = ?"); values.push(startDatetime); }
    if (description !== undefined) { fields.push("description = ?"); values.push(description); }
    if (location !== undefined) { fields.push("location = ?"); values.push(location); }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields provided to update" },
        { status: 400 }
      );
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE Events SET ${fields.join(", ")} WHERE eventId = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Event updated" });
  } catch (err) {
    console.error("[PUT /api/events]", err.message);
    return NextResponse.json(
      { success: false, error: err.message, code: err.code || null },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: id" },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      "DELETE FROM Events WHERE eventId = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Event deleted" });
  } catch (err) {
    console.error("[DELETE /api/events]", err.message);
    return NextResponse.json(
      { success: false, error: err.message, code: err.code || null },
      { status: 500 }
    );
  }
}