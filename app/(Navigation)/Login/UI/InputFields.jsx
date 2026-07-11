"use client";

export default function InputFields({
  type = "text",
  placeholder,
  value,
  onChange,
  error = "",
  className = "",
}) {
  return (
    <div className={className}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full rounded-xl border bg-white px-5 py-3 text-left text-sm text-neutral-800 outline-none focus:ring-2
        ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-black/25 focus:ring-[#556B2F]/50"
        }`}
      />

      {error && (
        <p className="text-red-600 text-xs mt-2 text-center">
          {error}
        </p>
      )}
    </div>
  );
}