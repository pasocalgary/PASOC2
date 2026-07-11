export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  const [rows] = await pool.execute(
    `SELECT priceId, memberPrice, dependantPrice 
     FROM Pricing 
     WHERE endDate IS NULL 
     LIMIT 1`
  );

  if (!rows[0]) {
    return NextResponse.json({ error: "No active pricing found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}