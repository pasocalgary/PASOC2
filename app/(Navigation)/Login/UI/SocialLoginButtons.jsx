"use client";

function SocialBox({ onClick, iconSrc, alt, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-14 w-20 rounded-xl border border-[#556B2F]/70 bg-white shadow-sm hover:bg-white/70 transition flex items-center justify-center"
    >
      <img src={iconSrc} className="h-6 w-6" alt={alt} />
    </button>
  );
}

export default function SocialLoginButtons({
  onFacebook,
  onGoogle,
  disabled,
}) {
  return (
    <div className="mt-6 flex gap-6">
      <SocialBox
        onClick={onFacebook}
        iconSrc="/facebook.svg"
        alt="Facebook"
        disabled={disabled}
      />

      <SocialBox
        onClick={onGoogle}
        iconSrc="/google.svg"
        alt="Google"
        disabled={disabled}
      />
    </div>
  );
}