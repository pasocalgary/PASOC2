"use client";
import React, { useEffect, useState } from "react";
import { Tag, Plus, X, Pencil, Trash2, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useUserAuth } from "../../../../_utils/auth-context";
import { Skeleton } from "@/app/_components/Skeleton";

const EMPTY_FORM = { title: "", description: "" };

export default function DonationPurposesPage() {
  const { user } = useUserAuth();
  const [purposes, setPurposes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addError, setAddError] = useState(null);
  const [addSaving, setAddSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  async function authHeaders() {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }

  async function fetchPurposes() {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      // Admin needs all purposes (including inactive), so we query directly
      const res = await fetch("/api/donation-purposes?admin=true", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || "Failed to load."); return; }
      setPurposes(data.data);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPurposes(); }, [user]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!addForm.title.trim()) { setAddError("Title is required."); return; }
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch("/api/donation-purposes", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ title: addForm.title, description: addForm.description }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setAddError(data.error || "Failed to save."); return; }
      setAddForm(EMPTY_FORM);
      setShowAdd(false);
      await fetchPurposes();
    } catch {
      setAddError("Could not reach the server.");
    } finally {
      setAddSaving(false);
    }
  }

  function startEdit(p) {
    setEditingId(p.purposeId);
    setEditForm({ title: p.title, description: p.description || "" });
    setEditError(null);
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editForm.title.trim()) { setEditError("Title is required."); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/donation-purposes/${editingId}`, {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ title: editForm.title, description: editForm.description }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setEditError(data.error || "Failed to save."); return; }
      setEditingId(null);
      await fetchPurposes();
    } catch {
      setEditError("Could not reach the server.");
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleActive(p) {
    try {
      const headers = await authHeaders();
      await fetch(`/api/donation-purposes/${p.purposeId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      await fetchPurposes();
    } catch {}
  }

  async function handleDelete(purposeId) {
    try {
      const headers = await authHeaders();
      await fetch(`/api/donation-purposes/${purposeId}`, {
        method: "DELETE",
        headers,
      });
      setConfirmDelete(null);
      await fetchPurposes();
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#f0ece1] font-sans">
      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#556B2F] text-white rounded-xl p-3">
              <Tag size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-serif text-[#556B2F]">Donation Purposes</h1>
              <p className="text-sm text-[#556B2F]/60 mt-0.5">
                These appear as options on the public donation page
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/DonationsManager"
              className="flex items-center gap-1.5 text-sm text-[#556B2F]/70 hover:text-[#556B2F] transition"
            >
              <ArrowLeft size={15} />
              Back
            </Link>
            <button
              onClick={() => { setShowAdd(true); setAddError(null); }}
              className="flex items-center gap-2 bg-[#556B2F] hover:bg-[#6b7d45] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              <Plus size={16} />
              Add Purpose
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white rounded-2xl border border-[#556B2F]/10 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#556B2F]">New Purpose</h2>
              <button onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }} className="text-[#556B2F]/40 hover:text-[#556B2F] transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#556B2F]/70 uppercase tracking-wide mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. General Fund, Youth Program"
                  className="w-full border border-[#556B2F]/20 rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#fafaf8] placeholder:text-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#556B2F]/70 uppercase tracking-wide mb-1.5">
                  Description <span className="text-[#aaa] font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description shown to donors"
                  rows={2}
                  className="w-full border border-[#556B2F]/20 rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#fafaf8] placeholder:text-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40 resize-none"
                />
              </div>
              {addError && (
                <p className="text-red-600 text-sm">{addError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }}
                  className="px-4 py-2 text-sm text-[#556B2F]/70 hover:text-[#556B2F] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="bg-[#556B2F] hover:bg-[#6b7d45] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
                >
                  {addSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* States */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-[#556B2F]/10 px-5 py-4"
              >
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">{error}</div>
        )}

        {/* List */}
        {!loading && !error && (
          <div className="flex flex-col gap-3">
            {purposes.length === 0 && (
              <div className="bg-white rounded-2xl border border-[#556B2F]/10 px-6 py-12 text-center text-[#999] text-sm">
                No purposes yet. Add one above.
              </div>
            )}
            {purposes.map((p) => (
              <div
                key={p.purposeId}
                className={`bg-white rounded-2xl border shadow-sm transition ${
                  p.isActive ? "border-[#556B2F]/10" : "border-gray-200 opacity-60"
                }`}
              >
                {editingId === p.purposeId ? (
                  <form onSubmit={handleEdit} className="p-5 flex flex-col gap-4">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full border border-[#556B2F]/20 rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#fafaf8] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40"
                    />
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      rows={2}
                      placeholder="Description (optional)"
                      className="w-full border border-[#556B2F]/20 rounded-lg px-3 py-2.5 text-sm text-[#333] bg-[#fafaf8] placeholder:text-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40 resize-none"
                    />
                    {editError && <p className="text-red-600 text-sm">{editError}</p>}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-sm text-[#556B2F]/70 hover:text-[#556B2F] transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editSaving}
                        className="flex items-center gap-1.5 bg-[#556B2F] hover:bg-[#6b7d45] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                      >
                        <Check size={14} />
                        {editSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#333] text-sm">{p.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-xs text-[#777] mt-1">{p.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleActive(p)}
                        title={p.isActive ? "Deactivate" : "Activate"}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#556B2F]/20 text-[#556B2F]/70 hover:bg-[#f0ece1] transition"
                      >
                        {p.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => startEdit(p)}
                        className="p-1.5 text-[#556B2F]/50 hover:text-[#556B2F] hover:bg-[#f0ece1] rounded-lg transition"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-serif text-lg text-[#556B2F] mb-2">Delete Purpose</h3>
            <p className="text-sm text-[#555] mb-6">
              Are you sure you want to delete <strong>{confirmDelete.title}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-[#556B2F]/70 hover:text-[#556B2F] border border-[#556B2F]/20 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.purposeId)}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
