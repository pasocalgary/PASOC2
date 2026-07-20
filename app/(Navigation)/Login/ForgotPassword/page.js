"use client";

import { useState } from "react";
import LoginPageTemp from "../UI/LoginPageTemp";
import InputFields from "../UI/InputFields";
import LoginSubmitButton from "../UI/LoginSubmitButton";
import { Divider } from "../Membership/components/FormUI";
import { useUserAuth } from "@/app/_utils/auth-context";
import Link from "next/link";
import {
  validateResetEmail,
} from "@/app/_utils/loginHelpers";

export default function ForgotPasswordPage() {
  // Form state (input, feedback, and loading control)
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Firebase auth method from context
  const { resetPassword } = useUserAuth();

  // Handle validation + password reset request
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate/multiple submissions
    if (loading) return;

    // Clear old messages before new submit
    setError("");
    setSuccess("");

    // Validate email using centralized helper
    const validationError = validateResetEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      // Normalize email before sending to Firebase
      await resetPassword(email.trim().toLowerCase());

      // Always show generic success message
      setSuccess(
        "If an account exists with this email, you will receive a password reset link."
      );
    } catch (err) {
      // Do not expose whether the email exists for security reasons
      setSuccess(
        "If an account exists with this email, you will receive a password reset link."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginPageTemp
      title="Forgot Password"
      subtitle="Enter your email and we’ll send you a password reset link."
    >
      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
        <div className="w-full max-w-115 space-y-6 [&_input]:text-center [&_input::placeholder]:text-center">
          <Divider />

          <InputFields
            id="reset-email"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            placeholder="Enter your email"
          />

          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              {success}
            </p>
          )}
        </div>

        {!success ? (
          <LoginSubmitButton
            loading={loading}
            loadingText="Sending..."
            disabled={loading}
          >
            Send Reset Link
          </LoginSubmitButton>
        ) : (
          <Link
            href="/Login/Member"
            className="mt-6 w-full max-w-115 text-center bg-[#556B2F] text-white py-3 rounded-xl shadow-md hover:brightness-95 transition"
          >
            Back to Login
          </Link>
        )}
      </form>
    </LoginPageTemp>
  );
}