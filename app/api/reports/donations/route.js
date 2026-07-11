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
    const dateClause = hasRange ? "AND d.donationDate BETWEEN ? AND ?" : "";
    const dateArgs = hasRange ? [startDate, endDate] : [];

    const [[kpiRow]] = await pool.query(
      `SELECT SUM(d.donationAmount) AS totalAmount, COUNT(*) AS count, AVG(d.donationAmount) AS avgAmount
       FROM Donations d WHERE 1=1 ${dateClause}`,
      dateArgs
    );

    const [[topDonor]] = await pool.query(
      `SELECT dr.fullName, SUM(d.donationAmount) AS total
       FROM Donations d
       LEFT JOIN DonationReceipt dr ON d.donationId = dr.donationId
       WHERE 1=1 ${dateClause}
       GROUP BY dr.fullName ORDER BY total DESC LIMIT 1`,
      dateArgs
    );

    const [chartData] = await pool.query(
      `SELECT DATE_FORMAT(d.donationDate, '%b %Y') AS month,
              SUM(d.donationAmount) AS total,
              COUNT(*) AS count
       FROM Donations d WHERE 1=1 ${dateClause}
       GROUP BY DATE_FORMAT(d.donationDate, '%Y-%m'), DATE_FORMAT(d.donationDate, '%b %Y')
       ORDER BY MIN(d.donationDate)`,
      dateArgs
    );

    const [pieData] = await pool.query(
      `SELECT d.paymentType AS name, COUNT(*) AS value
       FROM Donations d WHERE 1=1 ${dateClause}
       GROUP BY d.paymentType ORDER BY value DESC`,
      dateArgs
    );

    const [tableRows] = await pool.query(
      `SELECT dr.fullName, d.donationAmount, d.paymentType, d.donationDate,
              dp.title AS purposeTitle, d.confirmation
       FROM Donations d
       LEFT JOIN DonationReceipt dr ON d.donationId = dr.donationId
       LEFT JOIN DonationPurposes dp ON d.purposeId = dp.purposeId
       WHERE 1=1 ${dateClause}
       ORDER BY d.donationDate DESC`,
      dateArgs
    );

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalAmount: kpiRow.totalAmount || 0,
          count: kpiRow.count || 0,
          avgAmount: kpiRow.avgAmount || 0,
          topDonor: topDonor?.fullName
            ? `${topDonor.fullName} ($${Number(topDonor.total).toFixed(2)})`
            : "—",
        },
        chartData,
        pieData,
        tableRows,
      },
    });
  } catch (err) {
    console.error("[GET /api/reports/donations]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
