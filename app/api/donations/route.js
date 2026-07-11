export const dynamic = "force-dynamic";

import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { randomUUID } from "crypto";

const ROLES = { SUPERADMIN: 1, ADMIN: 2 };

async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { error: NextResponse.json({ success: false, error: "Missing bearer token" }, { status: 401 }) };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const [rows] = await pool.query(
      "SELECT roleId FROM MemberInfo WHERE uuid = ? LIMIT 1",
      [decoded.uid]
    );
    return { decoded, roleId: rows[0]?.roleId ?? 4 };
  } catch {
    return { error: NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 401 }) };
  }
}

function isAdmin(roleId) {
  const id = Number(roleId);
  return id === ROLES.ADMIN || id === ROLES.SUPERADMIN;
}

export async function GET(request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;

    if (!isAdmin(authResult.roleId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const [rows] = await pool.query(`
      SELECT
        d.donationId,
        d.email,
        d.paymentType,
        d.donationAmount,
        d.confirmation,
        d.donationDate,
        d.purposeId,
        dp.title AS purposeTitle,
        dr.fullName
      FROM Donations d
      LEFT JOIN DonationPurposes dp ON d.purposeId = dp.purposeId
      LEFT JOIN DonationReceipt dr ON d.donationId = dr.donationId
      ORDER BY d.donationDate DESC
    `);

    return NextResponse.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error("[GET /api/donations]", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        code: err.code || null,
        hint:
          err.code === "ER_NO_SUCH_TABLE" ? "Table does not exist." :
          err.code === "ECONNREFUSED" ? "Cannot reach MySQL." : "Check server logs.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;

    if (!isAdmin(authResult.roleId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { fullName, email, paymentType, donationAmount, purposeId, purposeTitle, donationDate } =
      await request.json();

    if (!donationAmount || isNaN(Number(donationAmount)) || Number(donationAmount) <= 0) {
      return NextResponse.json({ success: false, error: "A valid donation amount is required." }, { status: 400 });
    }

    const shortId = () => randomUUID().replace(/-/g, "").slice(0, 20);
    const donationId = shortId();
    const date = donationDate ? new Date(donationDate) : new Date();

    await pool.execute(
      `INSERT INTO Donations (donationId, email, paymentType, donationAmount, confirmation, donationDate, purposeId, campaign)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        donationId,
        email || null,
        paymentType || "cash",
        Number(donationAmount),
        date,
        purposeId || null,
        purposeTitle || null,
      ]
    );

    await pool.execute(
      `INSERT INTO DonationReceipt (receiptId, donationId, fullName, paymentType, donationAmount, purposeTitle)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        shortId(),
        donationId,
        fullName || null,
        paymentType || "cash",
        Number(donationAmount),
        purposeTitle || null,
      ]
    );

    return NextResponse.json({ success: true, donationId });
  } catch (err) {
    console.error("[POST /api/donations]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
