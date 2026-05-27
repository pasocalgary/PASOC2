"use client";
import React from "react";
import { Download, FileText } from "lucide-react";

// ── Colours matching the site palette ──────────────────────────────────────
const GREEN      = [85, 107, 47];   // #556B2F
const WHITE      = [255, 255, 255];
const GREY_LIGHT = [248, 247, 244];
const GREY_MID   = [200, 196, 185];
const TEXT_DARK  = [50, 60, 25];
const TEXT_MID   = [100, 115, 65];

// ── CSV export (unchanged) ──────────────────────────────────────────────────
function exportCSV(data, columns, filename) {
  const header = columns.map((c) => c.label).join(",");
  const rowLines = data.map((row) =>
    columns
      .map((c) => {
        const val = String(row[c.key] ?? "");
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      })
      .join(",")
  );
  const csv = [header, ...rowLines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF helper: raw cell value (strip JSX renders) ─────────────────────────
function rawCell(col, row) {
  const v = row[col.key];
  if (v == null) return "—";
  // If the column has a render fn, try to get a plain string back.
  // For simple string/number renders we call it and read the result;
  // for JSX renders we fall back to the raw value.
  if (col.render) {
    const result = col.render(v, row);
    if (typeof result === "string" || typeof result === "number") return String(result);
    // JSX element — use the raw value
    return String(v);
  }
  return String(v);
}

// ── Main PDF generator ──────────────────────────────────────────────────────
async function exportPDF({ data, columns, filename, title, kpis = [], dateRange }) {
  // Dynamic import so jsPDF is never bundled into the initial page load
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();   // 297 mm
  const PH = doc.internal.pageSize.getHeight();  // 210 mm
  const MARGIN = 14;
  const CONTENT_W = PW - MARGIN * 2;

  // ── 1. Header bar ────────────────────────────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, PW, 22, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title || "Report", MARGIN, 14);

  // Date range on the right
  if (dateRange) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const drText = `Period: ${dateRange}`;
    doc.text(drText, PW - MARGIN, 14, { align: "right" });
  }

  // ── 2. Generated timestamp ───────────────────────────────────────────────
  const generated = new Date().toLocaleString("en-CA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MID);
  doc.text(`Generated: ${generated}`, PW - MARGIN, 27, { align: "right" });

  let cursorY = 28;

  // ── 3. KPI cards ─────────────────────────────────────────────────────────
  if (kpis.length > 0) {
    const cardW = (CONTENT_W - (kpis.length - 1) * 4) / kpis.length;
    const cardH = 18;

    kpis.forEach((kpi, i) => {
      const x = MARGIN + i * (cardW + 4);

      // Card background
      doc.setFillColor(...(kpi.highlight ? GREEN : GREY_LIGHT));
      doc.roundedRect(x, cursorY, cardW, cardH, 2, 2, "F");

      // Label
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...(kpi.highlight ? [200, 220, 170] : TEXT_MID));
      doc.text(String(kpi.label), x + cardW / 2, cursorY + 5.5, { align: "center" });

      // Value
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(kpi.highlight ? WHITE : TEXT_DARK));
      const valStr = kpi.value != null ? String(kpi.value) : "—";
      doc.text(valStr, x + cardW / 2, cursorY + 13.5, { align: "center" });
    });

    cursorY += cardH + 6;
  }

  // ── 4. Divider ───────────────────────────────────────────────────────────
  doc.setDrawColor(...GREY_MID);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, cursorY, PW - MARGIN, cursorY);
  cursorY += 3;

  // ── 5. Data table ────────────────────────────────────────────────────────
  const headers = columns.map((c) => c.label);
  const rows    = data.map((row) => columns.map((col) => rawCell(col, row)));

  autoTable(doc, {
    startY: cursorY,
    head: [headers],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      textColor: TEXT_DARK,
      lineColor: GREY_MID,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: GREEN,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: GREY_LIGHT,
    },
    rowPageBreakBehavior: "avoid",
    didDrawPage: (hookData) => {
      // Footer on every page
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(...TEXT_MID);
      doc.text(
        `Page ${hookData.pageNumber} of ${pageCount}`,
        PW / 2,
        PH - 6,
        { align: "center" }
      );
      doc.text("PASOC", MARGIN, PH - 6);
    },
  });

  doc.save(`${filename}.pdf`);
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ReportExportBar({
  data = [],
  columns = [],
  filename = "report",
  title = "Report",
  kpis = [],
  dateRange,
}) {
  return (
    <div className="flex gap-3 justify-end print:hidden">
      <button
        onClick={() => exportCSV(data, columns, filename)}
        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#556B2F] text-[#556B2F] text-sm font-semibold rounded-xl hover:bg-[#f0ece1] transition-colors"
      >
        <Download size={16} />
        Export CSV
      </button>
      <button
        onClick={() => exportPDF({ data, columns, filename, title, kpis, dateRange })}
        className="flex items-center gap-2 px-4 py-2 bg-[#556B2F] text-white text-sm font-semibold rounded-xl hover:bg-[#4a5240] transition-colors"
      >
        <FileText size={16} />
        Export PDF
      </button>
    </div>
  );
}
