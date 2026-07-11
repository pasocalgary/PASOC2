"use client";

import Link from "next/link";
import BackButton from "../../../_components/BackButton";

export default function LoginPageTemp({ children, backHref = "/" }) {
  return (
    <main className="min-h-dvh bg-[#F4EFE7] relative overflow-y-auto md:overflow-hidden">
      <BackButton href={backHref} />

      <div className="min-h-dvh px-4 flex justify-center items-center">
        <div className="w-full max-w-[560px] flex flex-col items-center scale-90">
          <Link href="/" style={{ textDecoration: "none" }}>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/59857bbe636f97ab4cebcfbc3ad030ee40910eb4?placeholderIfAbsent=true&apiKey=fbbee8c7a138402fba2a2964fb2f753d"
              alt="PASOC Logo"
              className="w-[260px] sm:w-[320px] md:w-[360px] max-w-[85vw] mb-6"
            />
          </Link>

          {children}
        </div>
      </div>
    </main>
  );
}