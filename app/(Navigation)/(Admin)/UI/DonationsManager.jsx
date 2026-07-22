"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp, Plus, X, Tag } from "lucide-react";
import Link from "next/link";
import { useUserAuth } from "../../../_utils/auth-context";
import { Skeleton } from "@/app/_components/Skeleton";

const PAYMENT_TYPES = ["cash", "cheque", "e-transfer", "other"];

const EMPTY_FORM = {
  fullName: "",
  email: "",
  paymentType: "cash",
  donationAmount: "",
  purposeId: "",
  donationDate: new Date().toISOString().slice(0, 10),
};

const COLUMNS = [
  { key: "fullName",       label: "Donor" },
  { key: "email",          label: "Email" },
  { key: "donationAmount", label: "Amount" },
  { key: "paymentType",    label: "Payment" },
  { key: "purposeTitle",   label: "Purpose" },
  { key: "donationDate",   label: "Date" },
  { key: "confirmation",   label: "Status" },
];

function statusBadge(confirmed) {
  return Number(confirmed) === 1
    ? { label: "Paid",    color: "bg-green-100 text-green-700" }
    : { label: "Pending", color: "bg-yellow-100 text-yellow-700" };
}

function formatPayment(type) {
  if (!type) return "—";
  return type.replace("card_", "").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DonationsManager() {
  const { user } = useUserAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("donationDate");
  const [sortDir, setSortDir] = useState("desc");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [purposes, setPurposes] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  async function fetchDonations() {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const res = await fetch("/api/donations", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load donations.");
        setDonations([]);
        return;
      }
      setDonations(Array.isArray(data.data) ? data.data : []);
    } catch {
      setError("Could not reach the server.");
      setDonations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDonations(); }, [user]);

  useEffect(() => {
    fetch("/api/donation-purposes")
      .then((r) => r.json())
      .then((data) => { if (data.success) setPurposes(data.data); })
      .catch(() => {});
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    return [...donations]
      .filter((d) => {
        const q = search.toLowerCase();
        return (
          d.fullName?.toLowerCase().includes(q) ||
          d.email?.toLowerCase().includes(q) ||
          d.purposeTitle?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aVal = (a[sortField] ?? "").toString().toLowerCase();
        const bVal = (b[sortField] ?? "").toString().toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
  }, [donations, search, sortField, sortDir]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp size={14} className="text-[#556B2F]" />
      : <ChevronDown size={14} className="text-[#556B2F]" />;
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.donationAmount || Number(form.donationAmount) <= 0) {
      setFormError("Please enter a valid donation amount.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const selectedPurpose = purposes.find((p) => p.purposeId === form.purposeId);
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          donationAmount: Number(form.donationAmount),
          purposeTitle: selectedPurpose?.title || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setFormError(data.error || "Failed to save donation."); return; }
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      await fetchDonations();
    } catch {
      setFormError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#556B2F]/50" />
          <input
            type="text"
            placeholder="Search by name, email, or purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#556B2F]/20 bg-white text-sm text-[#333] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/DonationsManager/Purposes"
            className="flex items-center gap-2 border border-[#556B2F]/30 text-[#556B2F] hover:bg-[#556B2F]/10 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Tag size={16} />
            Purposes
          </Link>
          <button
            onClick={() => { setDrawerOpen(true); setFormError(null); }}
            className="flex items-center gap-2 bg-[#556B2F] hover:bg-[#6b7d45] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={16} />
            Record Donation
          </button>
        </div>
      </div>

      {/* States */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="bg-white rounded-2xl border border-[#556B2F]/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#556B2F]/10 bg-[#f7f4ee]">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-5 py-3.5 text-left text-xs font-semibold text-[#556B2F]/70 uppercase tracking-wide cursor-pointer select-none hover:text-[#556B2F] transition"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.key} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [0, 1, 2, 3, 4, 5].map((index) => (
                    <tr
                      key={index}
                      className={`border-b border-[#556B2F]/5 ${index % 2 === 0 ? "" : "bg-[#faf8f4]"}`}
                    >
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="px-5 py-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-5 py-16 text-center text-[#999] text-sm">
                      No donations found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((donation, i) => {
                    const status = statusBadge(donation.confirmation);
                    return (
                      <tr
                        key={donation.donationId || i}
                        className={`border-b border-[#556B2F]/5 hover:bg-[#f7f4ee] transition ${
                          i % 2 === 0 ? "" : "bg-[#faf8f4]"
                        }`}
                      >
                        <td className="px-5 py-4 font-medium text-[#333]">{donation.fullName || "—"}</td>
                        <td className="px-5 py-4 text-[#555]">{donation.email || "—"}</td>
                        <td className="px-5 py-4 text-[#333] font-medium">
                          {donation.donationAmount != null
                            ? `$${Number(donation.donationAmount).toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-[#555]">{formatPayment(donation.paymentType)}</td>
                        <td className="px-5 py-4 text-[#555]">{donation.purposeTitle || "—"}</td>
                        <td className="px-5 py-4 text-[#555]">
                          {donation.donationDate
                            ? new Date(donation.donationDate).toLocaleDateString("en-CA")
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record donation drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <aside className="relative z-50 w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#556B2F]/10">
              <div>
                <h2 className="text-lg font-serif text-[#556B2F]">Record Donation</h2>
                <p className="text-xs text-[#556B2F]/60 mt-0.5">Cash, cheque, or other manual payments</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-[#556B2F]/50 hover:text-[#556B2F] transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#556B2F]/70 mb-1.5 uppercase tracking-wide">Donor Name</label>
                <input type="text" name="fullName" value={form.fullName} onChange={handleFormChange} placeholder="Full name"
                  className="w-full border border-[#556B2F]/20 rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#fafaf8] placeholder:text-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#556B2F]/70 mb-1.5 uppercase tracking-wide">
                  Email <span className="text-[#aaa] font-normal normal-case">(optional)</span>
                </label>
                <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="donor@email.com"
                  className="w-full border border-[#556B2F]/20 rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#fafaf8] placeholder:text-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#556B2F]/70 mb-1.5 uppercase tracking-wide">
                  Amount <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center border border-[#556B2F]/20 rounded-lg bg-[#fafaf8] overflow-hidden">
                  <span className="px-3 text-sm text-[#556B2F]/60 border-r border-[#556B2F]/20 py-2.5">$</span>
                  <input type="number" name="donationAmount" value={form.donationAmount} onChange={handleFormChange}
                    placeholder="0.00" min="0.01" step="0.01"
                    className="flex-1 px-3 py-2.5 bg-transparent text-sm text-[#333] placeholder:text-[#aaa] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#556B2F]/70 mb-1.5 uppercase tracking-wide">Payment Method</label>
                <select name="paymentType" value={form.paymentType} onChange={handleFormChange}
                  className="w-full border border-[#556B2F]/20 rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#fafaf8] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40">
                  {PAYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              {purposes.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-[#556B2F]/70 mb-1.5 uppercase tracking-wide">
                    Purpose <span className="text-[#aaa] font-normal normal-case">(optional)</span>
                  </label>
                  <select name="purposeId" value={form.purposeId} onChange={handleFormChange}
                    className="w-full border border-[#556B2F]/20 rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#fafaf8] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40">
                    <option value="">— No specific purpose —</option>
                    {purposes.map((p) => (
                      <option key={p.purposeId} value={p.purposeId}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#556B2F]/70 mb-1.5 uppercase tracking-wide">Date Received</label>
                <input type="date" name="donationDate" value={form.donationDate} onChange={handleFormChange}
                  className="w-full border border-[#556B2F]/20 rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#fafaf8] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40" />
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{formError}</div>
              )}
              <div className="pt-2">
                <button type="submit" disabled={submitting}
                  className="w-full bg-[#556B2F] hover:bg-[#6b7d45] disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-xl transition">
                  {submitting ? "Saving..." : "Save Donation"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
