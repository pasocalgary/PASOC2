export const dynamic = 'force-dynamic';

import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

const ROLES = {
  SUPERADMIN: 1,
  ADMIN: 2,
  MEMBER: 3,
  GUEST: 4,
};

async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, error: "Missing bearer token" },
        { status: 401 }
      ),
    };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);

    const [rows] = await pool.query(
      "SELECT * FROM MemberInfo WHERE uuid = ? LIMIT 1",
      [decoded.uid]
    );

    return {
      decoded,
      memberRow: rows[0] || null,
      roleId: rows[0]?.roleId ?? ROLES.GUEST,
    };
  } catch (error) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }
}

function isAdmin(roleId) {
  const id = Number(roleId);
  return id === ROLES.ADMIN || id === ROLES.SUPERADMIN;
}

function isSuperAdmin(roleId) {
  return Number(roleId) === ROLES.SUPERADMIN;
}

export async function GET(request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;

    const { decoded, memberRow, roleId } = authResult;
    const { searchParams } = new URL(request.url);
    const requestedMemberID = searchParams.get("memberID");

    // Admin / Superadmin can fetch all members
    // or one specific member if memberID is provided
    if (isAdmin(roleId)) {
      if (requestedMemberID) {
        const [rows] = await pool.query(
          "SELECT * FROM MemberInfo WHERE uuid = ?",
          [requestedMemberID]
        );

        return NextResponse.json({
          success: true,
          count: rows.length,
          data: rows,
        });
      }

      const [rows] = await pool.query("SELECT * FROM MemberInfo");

      return NextResponse.json({
        success: true,
        count: rows.length,
        data: rows,
      });
    }

    // Non-admin users only get their own row
    return NextResponse.json({
      success: true,
      count: memberRow ? 1 : 0,
      isMember: !!memberRow,
      data: memberRow ? [memberRow] : [],
      firebaseUid: decoded.uid,
    });
  } catch (err) {
    console.error("[GET /api/member-info]", err);
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
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;

    const { roleId, decoded } = authResult;

    if (!isAdmin(roleId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      uuid,
      roleId: newRoleId,
      name,
      dateOfBirth,
      applicationDate,
      address,
      postalCode,
      primaryPhone,
      secondaryPhone,
      email,
    } = body;

    if (!uuid || !name || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: uuid, name, email",
        },
        { status: 400 }
      );
    }

    if (
      (newRoleId === ROLES.ADMIN || newRoleId === ROLES.SUPERADMIN) &&
      !isSuperAdmin(roleId)
    ) {
      return NextResponse.json(
        { success: false, error: "Only superadmin can create admin accounts" },
        { status: 403 }
      );
    }

    const assignedRoleId = newRoleId ?? ROLES.MEMBER;

    const [result] = await pool.query(
      `INSERT INTO MemberInfo 
      (uuid, roleId, name, dateOfBirth, applicationDate, address, postalCode, primaryPhone, secondaryPhone, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        assignedRoleId,
        name,
        dateOfBirth ?? null,
        applicationDate ?? null,
        address ?? null,
        postalCode ?? null,
        primaryPhone ?? null,
        secondaryPhone ?? null,
        email,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Member added",
      insertId: result.insertId,
      createdBy: decoded.uid,
    });
  } catch (err) {
    console.error("[POST /api/member-info]", err);
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

export async function DELETE(request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;

    const { roleId } = authResult;

    if (!isAdmin(roleId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberID = searchParams.get("uuid");

    if (!memberID) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: uuid" },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      "DELETE FROM MemberInfo WHERE uuid = ?",
      [memberID]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: "No member found with the provided uuid" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Member deleted",
    });
  } catch (err) {
    console.error("[DELETE /api/member-info]", err);
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

export async function PATCH(request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;

    const { roleId, memberRow, decoded } = authResult;
    const body = await request.json();

    const {
      uuid,
      roleId: requestedRoleId,
      name,
      applicationDate,
      address,
      postalCode,
      primaryPhone,
      secondaryPhone,
      email,
    } = body;

    let targetUUID = uuid;

    // Members can only update themselves
    if (!isAdmin(roleId)) {
      if (!memberRow) {
        return NextResponse.json(
          { success: false, error: "No member profile found for this user" },
          { status: 404 }
        );
      }
      targetUUID = memberRow.uuid;
    }

    if (!targetUUID) {
      return NextResponse.json(
        { success: false, error: "uuid is required" },
        { status: 400 }
      );
    }

    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if (applicationDate !== undefined) {
      fields.push("applicationDate = ?");
      values.push(applicationDate);
    }
    if (address !== undefined) {
      fields.push("address = ?");
      values.push(address);
    }
    if (postalCode !== undefined) {
      fields.push("postalCode = ?");
      values.push(postalCode);
    }
    if (primaryPhone !== undefined) {
      fields.push("primaryPhone = ?");
      values.push(primaryPhone);
    }
    if (secondaryPhone !== undefined) {
      fields.push("secondaryPhone = ?");
      values.push(secondaryPhone);
    }
    if (email !== undefined) {
      fields.push("email = ?");
      values.push(email);
    }

    // Only superadmin can change roleID
    if (requestedRoleId !== undefined) {
      if (!isSuperAdmin(roleId)) {
        return NextResponse.json(
          { success: false, error: "Only superadmin can change roleID" },
          { status: 403 }
        );
      }
      fields.push("roleID = ?");
      values.push(requestedRoleId);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields provided to update" },
        { status: 400 }
      );
    }

    values.push(targetUUID);

    const [result] = await pool.query(
      `UPDATE MemberInfo SET ${fields.join(", ")} WHERE uuid = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Member updated successfully",
      updatedBy: decoded.uid,
    });
  } catch (error) {
    console.error("[PATCH /api/member-info]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}