"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useUserAuth } from "../../../../_utils/auth-context";
import ReportFilterBar from "../../UI/ReportFilterBar";
import ReportKPICards from "../../UI/ReportKPICards";
import ReportChart from "../../UI/ReportChart";
import ReportDataTable from "../../UI/ReportDataTable";
import ReportExportBar from "../../UI/ReportExportBar";

const COLUMNS = [
  { key: "title", label: "Event Name" },
  {
    key: "date",
    label: "Date",
    render: (v) => (v ? new Date(v).toLocaleDateString("en-CA") : "—"),
  },
  { key: "attendees", label: "Attendees" },
  { key: "location", label: "Location" },
];

const CHART_BARS = [{ key: "attendees", label: "Attendees" }];

function getDefaultFilters() {
  const now = new Date();
  return {
    startDate: `${now.getFullYear()}-01-01`,
    endDate: now.toISOString().slice(0, 10),
    preset: "year",
    eventId: "",
  };
}

export default function AttendanceReportPage() {
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
      if (f.eventId) params.set("eventId", f.eventId);
      const res = await fetch(`/api/Database/reports/attendance?${params}`, {
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

  const eventOptions = useMemo(() => {
    const base = [{ value: "", label: "All Events" }];
    if (!data?.events) return base;
    return [...base, ...data.events.map((e) => ({ value: String(e.eventId), label: e.title }))];
  }, [data?.events]);

  const kpis = data
    ? [
        { label: "Total Attendees", value: data.kpis.totalAttendees, highlight: true },
        { label: "Avg per Event", value: data.kpis.avgPerEvent },
        { label: "Highest-Attended Event", value: data.kpis.highestEvent },
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
              <CheckCircle size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-serif text-[#556B2F]">Attendance Reports</h1>
              <p className="text-sm text-[#556B2F]/60 mt-0.5">Event attendance per period</p>
            </div>
          </div>

          <ReportFilterBar
            filters={filters}
            onChange={handleChange}
            onApply={() => fetchReport(filters)}
            onReset={handleReset}
            extras={[{ key: "eventId", label: "Filter by Event", type: "select", options: eventOptions }]}
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
              <ReportDataTable columns={COLUMNS} rows={data.tableRows} defaultSort="date" />
              <ReportExportBar
                data={data.tableRows}
                columns={COLUMNS}
                filename="attendance-report"
                title="Attendance Report"
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
