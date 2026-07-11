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
      roleID: rows[0]?.roleID ?? ROLES.GUEST,
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

function isAdmin(roleID) {
  const id = Number(roleID);
  return id === ROLES.ADMIN || id === ROLES.SUPERADMIN;
}

export async function GET(request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;

    const { decoded, roleID } = authResult;
    const { searchParams } = new URL(request.url);

    const eventId = searchParams.get("eventId");
    const uuid = searchParams.get("uuid");

    let query = "SELECT * FROM EventRegistrations";
    let values = [];
    let conditions = [];

    if (eventId) {
      conditions.push("eventId = ?");
      values.push(eventId);
    }

    if (isAdmin(roleID)) {
      if (uuid) {
        conditions.push("uuid = ?");
        values.push(uuid);
      }
    } else {
      conditions.push("uuid = ?");
      values.push(decoded.uid);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const [rows] = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("[GET /EventRegistrations]", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;

    const { decoded } = authResult;
    const body = await request.json();

    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "eventId is required" },
        { status: 400 }
      );
    }

    // Check that the event exists and has not already started/passed
    const [eventRows] = await pool.query(
      "SELECT eventId, startDatetime FROM Events WHERE eventId = ? LIMIT 1",
      [eventId]
    );

    if (eventRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const eventStart = eventRows[0]?.startDatetime
      ? new Date(eventRows[0].startDatetime)
      : null;

    if (!eventStart || Number.isNaN(eventStart.getTime())) {
      return NextResponse.json(
        { success: false, error: "Event has an invalid start date" },
        { status: 400 }
      );
    }

    if (eventStart <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration is closed because this event date has already passed",
        },
        { status: 400 }
      );
    }

    // Prevent duplicate registration
    const [existing] = await pool.query(
      "SELECT * FROM EventRegistrations WHERE eventId = ? AND uuid = ?",
      [eventId, decoded.uid]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Already registered" },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      `INSERT INTO EventRegistrations (eventId, uuid)
       VALUES (?, ?)`,
      [eventId, decoded.uid]
    );

    return NextResponse.json({
      success: true,
      message: "Registered successfully",
      insertId: result.insertId,
    });
  } catch (err) {
    console.error("[POST /EventRegistrations]", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (authResult.error) return authResult.error;

    const { decoded, roleID } = authResult;
    const { searchParams } = new URL(request.url);

    const eventId = searchParams.get("eventId");
    const uuid = searchParams.get("uuid") || decoded.uid;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "eventId is required" },
        { status: 400 }
      );
    }

    if (!isAdmin(roleID) && uuid !== decoded.uid) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const [result] = await pool.query(
      "DELETE FROM EventRegistrations WHERE eventId = ? AND uuid = ?",
      [eventId, uuid]
    );

    return NextResponse.json({
      success: true,
      message: "Registration removed",
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error("[DELETE /EventRegistrations]", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}