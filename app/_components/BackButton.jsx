import Link from "next/link";

export default function BackButton({ href = "/" }) {
  return (
      <Link href="/" className="absolute left-6 top-6">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#556B2F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
  );
}