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

    const hasRange = startDate && endDate;
    const dateClause = hasRange ? "AND m.applicationDate BETWEEN ? AND ?" : "";
    const dateArgs = hasRange ? [startDate, endDate] : [];

    // Global counts (not date-filtered — snapshot of current state)
    const [[activeRow]] = await pool.query(
      `SELECT COUNT(DISTINCT m.uuid) AS count
       FROM MemberInfo m
       INNER JOIN MembershipPayments mp ON m.uuid = mp.uuid AND mp.confirmation = 1`
    );
    const [[pendingRow]] = await pool.query(
      `SELECT COUNT(DISTINCT m.uuid) AS count
       FROM MemberInfo m
       LEFT JOIN MembershipPayments mp ON m.uuid = mp.uuid AND mp.confirmation = 1
       WHERE mp.uuid IS NULL`
    );

    // New members in the selected period
    const [[newRow]] = await pool.query(
      `SELECT COUNT(*) AS count FROM MemberInfo m WHERE 1=1 ${dateClause}`,
      dateArgs
    );

    // Chart: monthly new signups in period
    const [chartData] = await pool.query(
      `SELECT DATE_FORMAT(m.applicationDate, '%b %Y') AS month, COUNT(*) AS count
       FROM MemberInfo m
       WHERE m.applicationDate IS NOT NULL ${dateClause}
       GROUP BY DATE_FORMAT(m.applicationDate, '%Y-%m'), DATE_FORMAT(m.applicationDate, '%b %Y')
       ORDER BY MIN(m.applicationDate)`,
      dateArgs
    );

    const pieData = [
      { name: "Active", value: activeRow.count },
      { name: "Pending", value: pendingRow.count },
    ];

    // Table rows: members in period with payment status
    const [tableRows] = await pool.query(
      `SELECT
         m.name,
         m.email,
         m.applicationDate,
         mp.paidAt,
         CASE WHEN mp.confirmation = 1 THEN 'Active' ELSE 'Pending' END AS status
       FROM MemberInfo m
       LEFT JOIN (
         SELECT uuid, MAX(paidAt) AS paidAt, 1 AS confirmation
         FROM MembershipPayments
         WHERE confirmation = 1
         GROUP BY uuid
       ) mp ON m.uuid = mp.uuid
       WHERE 1=1 ${dateClause}
       ORDER BY m.applicationDate DESC`,
      dateArgs
    );

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalActive: activeRow.count,
          newThisPeriod: newRow.count,
          pending: pendingRow.count,
        },
        chartData,
        pieData,
        tableRows,
      },
    });
  } catch (err) {
    console.error("[GET /api/reports/membership]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
