export const dynamic = 'force-dynamic';

import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Verify connection
    const connection = await pool.getConnection();
    connection.release();

    const [rows] = await pool.query(
      "SELECT * FROM PasocOfficers ORDER BY officerId DESC"
    );

    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows,
    });

  } catch (err) {
    console.error("[GET /api/about]", err.message);

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
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, email",
        },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      "INSERT INTO PasocOfficers (name, email) VALUES (?, ?)",
      [name, email]
    );

    return NextResponse.json({
      success: true,
      message: "Officer added",
      insertId: result.insertId,
    });

  } catch (err) {
    console.error("[POST /api/about]", err.message);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
        code: err.code || null,
        hint:
          err.code === "ER_NO_SUCH_TABLE"
            ? "Table does not exist."
            : "Check server logs.",
      },
      { status: 500 }
    );
  }
}