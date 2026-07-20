"use client";

export default function LoginSubmitButton({
  children,
  loading = false,
  loadingText = "Loading...",
  disabled = false,
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="mt-7 w-full max-w-[300px] bg-[#556B2F] text-white py-3 rounded-xl shadow-md hover:brightness-95 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {loading ? loadingText : children}
    </button>
  );
}