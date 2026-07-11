export const dynamic = "force-dynamic";

import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

const ROLES = { SUPERADMIN: 1, ADMIN: 2 };

async function getAuthenticatedAdmin(request) {
  const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return { error: NextResponse.json({ success: false, error: "Missing token" }, { status: 401 }) };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const [rows] = await pool.query("SELECT roleId FROM MemberInfo WHERE uuid = ? LIMIT 1", [decoded.uid]);
    const roleId = Number(rows[0]?.roleId ?? 4);
    if (roleId !== ROLES.ADMIN && roleId !== ROLES.SUPERADMIN) {
      return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
    }
    return { roleId };
  } catch {
    return { error: NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 }) };
  }
}

export async function GET(request) {
  try {
    const auth = await getAuthenticatedAdmin(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status"); // "upcoming" | "past" | ""

    const conditions = [];
    const args = [];
    if (startDate && endDate) { conditions.push("e.startDatetime BETWEEN ? AND ?"); args.push(startDate, endDate); }
    if (status === "upcoming") conditions.push("e.startDatetime > NOW()");
    else if (status === "past") conditions.push("e.startDatetime <= NOW()");
    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [tableRows] = await pool.query(
      `SELECT
         e.eventId, e.title, e.startDatetime, e.endDatetime, e.location, e.capacity,
         COUNT(er.id) AS attendees,
         CASE WHEN e.startDatetime > NOW() THEN 'Upcoming' ELSE 'Past' END AS status
       FROM Events e
       LEFT JOIN EventRegistrations er ON e.eventId = er.eventId
       ${whereClause}
       GROUP BY e.eventId, e.title, e.startDatetime, e.endDatetime, e.location, e.capacity
       ORDER BY e.startDatetime DESC`,
      args
    );

    const totalEvents = tableRows.length;
    const totalAttendees = tableRows.reduce((s, r) => s + Number(r.attendees), 0);
    const avgAttendance = totalEvents > 0 ? (totalAttendees / totalEvents).toFixed(1) : 0;
    const upcomingCount = tableRows.filter((r) => r.status === "Upcoming").length;

    const chartData = [...tableRows].reverse().map((r) => ({
      name: r.title.length > 20 ? r.title.slice(0, 20) + "…" : r.title,
      attendees: Number(r.attendees),
    }));

    return NextResponse.json({
      success: true,
      data: {
        kpis: { totalEvents, avgAttendance, upcomingCount },
        chartData,
        tableRows,
      },
    });
  } catch (err) {
    console.error("[GET /api/reports/events]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
