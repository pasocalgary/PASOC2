"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useUserAuth } from "../../../../_utils/auth-context";
import ReportFilterBar from "../../UI/ReportFilterBar";
import ReportKPICards from "../../UI/ReportKPICards";
import ReportChart from "../../UI/ReportChart";
import ReportDataTable from "../../UI/ReportDataTable";
import ReportExportBar from "../../UI/ReportExportBar";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const COLUMNS = [
  { key: "title", label: "Event Name" },
  {
    key: "startDatetime",
    label: "Date",
    render: (v) => (v ? new Date(v).toLocaleDateString("en-CA") : "—"),
  },
  {
    key: "status",
    label: "Status",
    render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v === "Upcoming" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
        {v}
      </span>
    ),
  },
  { key: "attendees", label: "Attendees" },
  { key: "capacity", label: "Capacity" },
  { key: "location", label: "Location" },
];

const CHART_BARS = [{ key: "attendees", label: "Attendees" }];

function getDefaultFilters() {
  const now = new Date();
  return {
    startDate: `${now.getFullYear()}-01-01`,
    endDate: now.toISOString().slice(0, 10),
    preset: "year",
    status: "",
  };
}

export default function EventReportPage() {
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
      if (f.status) params.set("status", f.status);
      const res = await fetch(`/api/Database/reports/events?${params}`, {
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
        { label: "Total Events", value: data.kpis.totalEvents },
        { label: "Avg Attendance", value: data.kpis.avgAttendance },
        { label: "Upcoming Events", value: data.kpis.upcomingCount, highlight: true },
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
              <CalendarDays size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-serif text-[#556B2F]">Event Reports</h1>
              <p className="text-sm text-[#556B2F]/60 mt-0.5">Events, attendance, and upcoming schedule</p>
            </div>
          </div>

          <ReportFilterBar
            filters={filters}
            onChange={handleChange}
            onApply={() => fetchReport(filters)}
            onReset={handleReset}
            extras={[{ key: "status", label: "Status", type: "select", options: STATUS_OPTIONS }]}
          />

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {loading && (
            <div className="text-center py-16 text-[#556B2F]/60 text-sm">Loading report…</div>
          )}

          {!loading && data && (
            <>
              <ReportKPICards cards={kpis} />
              <ReportChart
                data={data.chartData}
                xKey="name"
                bars={CHART_BARS}
                title="Attendance Per Event"
              />
              <ReportDataTable columns={COLUMNS} rows={data.tableRows} defaultSort="startDatetime" />
              <ReportExportBar
                data={data.tableRows}
                columns={COLUMNS}
                filename="event-report"
                title="Event Report"
                kpis={kpis}
                dateRange={`${filters.startDate} – ${filters.endDate}`}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
