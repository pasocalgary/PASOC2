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
    const [rows] = await pool.query("SELECT roleId FROM MemberInfo WHERE uuid = ? LIMIT 1", [decoded.uid]);
    return { roleId: rows[0]?.roleId ?? 4 };
  } catch {
    return { error: NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 401 }) };
  }
}

function isAdmin(roleId) {
  const id = Number(roleId);
  return id === ROLES.ADMIN || id === ROLES.SUPERADMIN;
}

// Public by default; pass ?admin=true with a valid admin token to get all (including inactive)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminView = searchParams.get("admin") === "true";

    if (adminView) {
      const authResult = await getAuthenticatedUser(request);
      if (authResult.error) return authResult.error;
      if (!isAdmin(authResult.roleId)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      const [rows] = await pool.query(
        "SELECT purposeId, title, description, isActive FROM DonationPurposes ORDER BY isActive DESC, title ASC"
      );
      return NextResponse.json({ success: true, data: rows });
    }

    const [rows] = await pool.query(
      "SELECT purposeId, title, description FROM DonationPurposes WHERE isActive = 1 ORDER BY title ASC"
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error("[GET /api/donation-purposes]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Admin — create a new purpose
export async function POST(request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;
    if (!isAdmin(authResult.roleId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { title, description, isActive } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: "Title is required." }, { status: 400 });
    }

    const purposeId = randomUUID().replace(/-/g, "").slice(0, 20);

    await pool.execute(
      `INSERT INTO DonationPurposes (purposeId, title, description, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [purposeId, title.trim(), description?.trim() || null, isActive ? 1 : 1]
    );

    return NextResponse.json({ success: true, purposeId });
  } catch (err) {
    console.error("[POST /api/donation-purposes]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
