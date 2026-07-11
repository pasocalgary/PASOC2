"use client";

import { useState } from "react";

export default function GuestPage() {
  const [form, setForm] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(''); 

  const handleChange = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/Guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (res.ok) {
      setSuccess(true);
      setError('');
      setForm({ name: "", email: "" });
    } else {
      const data = await res.json();
      if (res.status === 409) {
        setError(' This email is already registered.');
      } else {
        setError(` ${data.error || 'Something went wrong. Please try again.'}`);
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F4EFE7] px-4 py-12">
      <div className="w-full max-w-4xl flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-lg border border-[#ddd6ca]">

        {/* Left Panel — hidden on mobile */}
        <div className="hidden md:flex flex-col justify-center bg-[#556B2F] text-white px-10 py-14 w-full md:w-1/2">
          <p className="text-xs uppercase tracking-widest text-[#b8cc8a] font-semibold mb-4">
            Pangasinan Society of Calgary
          </p>
          <h1 className="text-4xl font-serif leading-tight mb-5">
            Join Our<br />Mailing List
          </h1>
          <p className="text-[#d4e4a8] text-sm leading-relaxed mb-8">
            Become a guest member and stay connected with the Pangasinan community in Calgary. 
            Hear about our cultural events, gatherings, and announcements.
          </p>

          <div className="mt-12 pt-8 border-t border-[#6b8a3a]">
            <p className="text-xs text-[#9ab865] leading-relaxed">
              Your information is kept private and will only be used to send you relevant PASOC announcements.
            </p>
          </div>
        </div>

        {/* Right Panel — form */}
        <div className="flex flex-col justify-center bg-white px-8 py-12 w-full md:w-1/2">
          <h2 className="text-2xl font-serif text-[#556B2F] mb-1">Become a Guest</h2>
          <p className="text-sm text-gray-500 mb-8">Fill out the form below and we&apos;ll be in touch.</p>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-6">
              Submitted! Check your inbox!
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
              Error:{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7E9A45] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7E9A45] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#556B2F] hover:bg-[#7E9A45] text-white py-3 rounded-xl text-sm font-semibold tracking-wide transition-colors duration-200 mt-2 disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Join the Mailing List →"}
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}