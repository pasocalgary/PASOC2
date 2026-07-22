"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Users, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useUserAuth } from "../../../_utils/auth-context";
import Link from "next/link";
import { Skeleton } from "@/app/_components/Skeleton";

export default function ManageMembersPage() {
  const { user } = useUserAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    async function fetchMembers() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = await user.getIdToken();

        const res = await fetch("/api/member-info", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load members.");
          setMembers([]);
          return;
        }

        if (data.success) {
          // Normalize returned rows so frontend always has consistent keys
          const normalizedMembers = Array.isArray(data.data)
            ? data.data.map((member) => ({
                ...member,
                roleId: member.roleID ?? member.roleId ?? 4,
              }))
            : [];

          setMembers(normalizedMembers);

          // Helpful notice: if only one member came back, user may not be admin
          if (normalizedMembers.length <= 1 && !data.count === 0) {
            // no-op, just keeping room for future logic
          }
        } else {
          setError(data.error || "Failed to load members.");
          setMembers([]);
        }
      } catch (err) {
        setError("Could not reach the server.");
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [user]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    return [...members]
      .filter((m) => {
        const q = search.toLowerCase();
        return (
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aVal = (a[sortField] ?? "").toString().toLowerCase();
        const bVal = (b[sortField] ?? "").toString().toLowerCase();

        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
  }, [members, search, sortField, sortDir]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ChevronDown size={14} className="opacity-30" />;
    }

    return sortDir === "asc" ? (
      <ChevronUp size={14} className="text-[#556B2F]" />
    ) : (
      <ChevronDown size={14} className="text-[#556B2F]" />
    );
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "primaryPhone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "applicationDate", label: "Member Since" },
    { key: "roleId", label: "Role" },
  ];

  const roleLabel = (roleId) => {
    switch (parseInt(roleId)) {
      case 1:
        return { label: "Superadmin", color: "bg-red-100 text-red-700" };
      case 2:
        return { label: "Admin", color: "bg-orange-100 text-orange-700" };
      case 3:
        return { label: "Member", color: "bg-green-100 text-green-700" };
      case 4:
        return { label: "None", color: "bg-gray-100 text-gray-500" };
      default:
        return { label: "Unknown", color: "bg-gray-100 text-gray-400" };
    }
  };

  return (
    <div className="min-h-screen bg-[#f0ece1] font-sans">
      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-[#556B2F] text-white rounded-xl p-3">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-serif text-[#556B2F]">Members</h1>
            <p className="text-sm text-[#556B2F]/60 mt-0.5">
              {loading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                `${filtered.length} of ${members.length} members`
              )}
            </p>
          </div>
        </div>

        {/* Search  & Add Admin Button*/}
        <div className="flex items-center justify-between mb-6">
          {/* Search */}
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#556B2F]/50" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#556B2F]/20 bg-white text-sm text-[#333] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#7E9A45]/40"
            />
          </div>

          {/* Add Admin Button */}
          <Link
            href="/CreateAdmin"
            className="px-4 py-2 rounded-xl bg-[#556B2F] text-white text-sm font-medium hover:bg-[#6f8440] transition">
              Add Admin Account
          </Link>
        </div>

        {/* States */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && members.length === 1 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-5 py-4 text-sm">
            Only one account was returned. If you expected all accounts, make sure
            this logged-in user has <strong>roleID 1 or 2</strong> in the
            <code className="mx-1">MemberInfo</code> table.
          </div>
        )}

        {/* Table */}
        {!error && (
          <div className="bg-white rounded-2xl border border-[#556B2F]/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#556B2F]/10 bg-[#f7f4ee]">
                    {columns.map((col) => (
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
                        {columns.map((col) => (
                          <td key={col.key} className="px-5 py-4">
                            <Skeleton className="h-4 w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-5 py-16 text-center text-[#999] text-sm">
                        No members found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((member, i) => {
                      const role = roleLabel(member.roleId);
                      return (
                        <tr
                          key={member.email || `${member.name || "member"}-${i}`}
                          className={`border-b border-[#556B2F]/5 hover:bg-[#f7f4ee] transition ${
                            i % 2 === 0 ? "" : "bg-[#faf8f4]"
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium text-[#333]">
                              {member.name || "—"}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[#555]">
                            {member.email || "—"}
                          </td>
                          <td className="px-5 py-4 text-[#555]">
                            {member.primaryPhone || "—"}
                          </td>
                          <td className="px-5 py-4 text-[#555]">
                            <div>{member.address || "—"}</div>
                            {member.postalCode && (
                              <div className="text-xs text-[#999]">
                                {member.postalCode}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-[#555]">
                            {member.applicationDate
                              ? new Date(member.applicationDate).toLocaleDateString("en-CA")
                              : "—"}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${role.color}`}>
                              {role.label}
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
      </main>
    </div>
  );
}