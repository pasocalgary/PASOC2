"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

export default function PasswordField({
  placeholder = "Password",
  value,
  onChange,
  error = "",
  children,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full rounded-xl border bg-white px-5 py-3 pr-14 text-left text-sm text-neutral-800 outline-none focus:ring-2
          ${
            error
              ? "border-red-400 focus:ring-red-200"
              : "border-black/25 focus:ring-[#556B2F]/50"
          }`}
        />

        <button
          type="button"
          aria-label="Show password"
          onMouseDown={() => setShowPassword(true)}
          onMouseUp={() => setShowPassword(false)}
          onMouseLeave={() => setShowPassword(false)}
          onTouchStart={() => setShowPassword(true)}
          onTouchEnd={() => setShowPassword(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#556B2F]"
        >
          <Eye size={18} />
        </button>
      </div>

      {children}
    </div>
  );
}