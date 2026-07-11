export const dynamic = "force-dynamic";

import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

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

export async function PATCH(request, { params }) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;
    if (!isAdmin(authResult.roleId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { title, description, isActive } = await request.json();
    const fields = [];
    const values = [];

    if (title !== undefined) { fields.push("title = ?"); values.push(title.trim()); }
    if (description !== undefined) { fields.push("description = ?"); values.push(description?.trim() || null); }
    if (isActive !== undefined) { fields.push("isActive = ?"); values.push(isActive ? 1 : 0); }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update." }, { status: 400 });
    }

    fields.push("updatedAt = NOW()");
    values.push(params.purposeId);

    const [result] = await pool.execute(
      `UPDATE DonationPurposes SET ${fields.join(", ")} WHERE purposeId = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Purpose not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/donation-purposes/:id]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;
    if (!isAdmin(authResult.roleId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const [result] = await pool.execute(
      "DELETE FROM DonationPurposes WHERE purposeId = ?",
      [params.purposeId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Purpose not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/donation-purposes/:id]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
