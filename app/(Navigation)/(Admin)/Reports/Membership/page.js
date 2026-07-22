"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { useUserAuth } from "../../../../_utils/auth-context";
import ReportFilterBar from "../../UI/ReportFilterBar";
import ReportKPICards from "../../UI/ReportKPICards";
import ReportChart from "../../UI/ReportChart";
import ReportDataTable from "../../UI/ReportDataTable";
import ReportExportBar from "../../UI/ReportExportBar";
import ReportSkeleton from "../../UI/ReportSkeleton";

const COLUMNS = [
  { key: "name", label: "Member Name" },
  { key: "email", label: "Email" },
  {
    key: "applicationDate",
    label: "Join Date",
    render: (v) => (v ? new Date(v).toLocaleDateString("en-CA") : "—"),
  },
  {
    key: "paidAt",
    label: "Payment Date",
    render: (v) => (v ? new Date(v).toLocaleDateString("en-CA") : "—"),
  },
  {
    key: "status",
    label: "Status",
    render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v === "Active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
        {v}
      </span>
    ),
  },
];

const CHART_BARS = [{ key: "count", label: "New Members" }];

function getDefaultFilters() {
  const now = new Date();
  return {
    startDate: `${now.getFullYear()}-01-01`,
    endDate: now.toISOString().slice(0, 10),
    preset: "year",
  };
}

export default function MembershipReportPage() {
  const { user } = useUserAuth();
  const [filters, setFilters] = useState(getDefaultFilters());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchReport(f) {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams({ startDate: f.startDate, endDate: f.endDate });
      const res = await fetch(`/api/reports/membership?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user) fetchReport(filters); }, [user]);

  function handleChange(key, val) {
    setFilters((f) => ({ ...f, [key]: val }));
  }

  function handleReset() {
    const defaults = getDefaultFilters();
    setFilters(defaults);
    fetchReport(defaults);
  }

  const kpis = data
    ? [
        { label: "Total Active Members", value: data.kpis.totalActive, highlight: true },
        { label: "New Members This Period", value: data.kpis.newThisPeriod },
        { label: "Pending (No Payment)", value: data.kpis.pending },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[#f0ece1] flex flex-col font-sans">
      <main className="flex-1 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Link href="/Reports" className="text-[#556B2F]/60 hover:text-[#556B2F] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="bg-[#556B2F] text-white rounded-xl p-3">
              <Users size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-serif text-[#556B2F]">Membership Reports</h1>
              <p className="text-sm text-[#556B2F]/60 mt-0.5">Track member growth and payment status</p>
            </div>
          </div>

          <ReportFilterBar
            filters={filters}
            onChange={handleChange}
            onApply={() => fetchReport(filters)}
            onReset={handleReset}
          />

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {loading && <ReportSkeleton kpiCount={3} />}

          {!loading && data && (
            <>
              <ReportKPICards cards={kpis} />
              <ReportChart
                data={data.chartData}
                xKey="month"
                bars={CHART_BARS}
                pieData={data.pieData}
                title="New Member Signups"
              />
              <ReportDataTable columns={COLUMNS} rows={data.tableRows} defaultSort="applicationDate" />
              <ReportExportBar data={data.tableRows} columns={COLUMNS} filename="membership-report" />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
