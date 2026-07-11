"use client";

import { setAuthCookie } from "@/app/_utils/actions";
import Link from "next/link";
import { useState } from "react";
import { useUserAuth } from "../../../_utils/auth-context";
import { useRouter } from "next/navigation";

import { Divider } from "../Membership/components/FormUI";
import LoginPageTemp from "../UI/LoginPageTemp";
import InputFields from "../UI/InputFields";
import PasswordField from "../UI/PasswordField";
import LoginSubmitButton from "../UI/LoginSubmitButton";
import RecaptchaWidget from "../UI/RecaptchaWidget";
import { verifyRecaptchaToken } from "../../../_utils/Recaptcha";

import {
  getFirebaseErrorMessage,
  validateLoginForm,
} from "../../../_utils/loginHelpers";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [recaptchaError, setRecaptchaError] = useState("");

  const { emailSignIn, resetPassword } = useUserAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    // Field-level validation from utils
    const newErrors = validateLoginForm(email, password);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    // Ensure reCAPTCHA is completed before login
    if (!recaptchaToken) {
      setRecaptchaError("Please complete the reCAPTCHA.");
      return;
    }

    // Verify reCAPTCHA token with backend
    const recaptchaResult = await verifyRecaptchaToken(recaptchaToken);

    if (!recaptchaResult.success) {
      setRecaptchaToken(""); // Reset token if verification fails
      setRecaptchaError("reCAPTCHA verification failed. Try again.");
      return;
    }

    setLoading(true);

    try {
      //Firebase signs the user in
      const userCredential = await emailSignIn(email, password)
      const firebaseUser = userCredential.user

      //Store ID to cookie
      await setAuthCookie(firebaseUser.uid)

      router.push("/Dashboard");
    } catch (err) {
      // Firebase error handling
      setErrors({
        general: getFirebaseErrorMessage(err.code),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrors((prev) => ({
        ...prev,
        general: "Please enter your email first.",
      }));
      return;
    }

    try {
      await resetPassword(email);
      setErrors((prev) => ({
        ...prev,
        general: "Password reset email sent.",
      }));
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        setErrors((prev) => ({
          ...prev,
          general: "No account found with that email.",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          general: "Something went wrong.",
        }));
      }
    }
  };

  return (
    <LoginPageTemp backHref="/">
      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="font-serif font-extrabold text-4xl text-[#556B2F] tracking-wide">
          ADMIN LOGIN
        </h1>

        <Divider />

        <p className="mt-3 text-sm text-black/65">
          Internal access for authorized PASOC administrators
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col items-center"
        noValidate
      >
        <div className="w-full max-w-115 space-y-5">
          <InputFields
            type="email"
            placeholder="Admin Email Address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({
                ...prev,
                email: "",
                general: "",
              }));
            }}
            error={errors.email}
          />

          <PasswordField
            placeholder="Admin Password"
            value={password}
            type={showPassword ? "text" : "password"}
            onToggle={() => setShowPassword(!showPassword)}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({
                ...prev,
                password: "",
                general: "",
              }));
            }}
            error={errors.password}
          />

          {/* General error (Firebase, etc) */}
          {errors.general && (
            <div className="rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm px-4 py-2 text-center">
              {errors.general}
            </div>
          )}

          <div className="flex items-center justify-end text-xs text-black/70">
            <Link
              href="/Login/ForgotPassword"
              className="hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* reCAPTCHA verification */}
        <div className="mt-4 space-y-2">
          <RecaptchaWidget
            onVerify={(token) => {
              setRecaptchaToken(token); // Save token when user passes reCAPTCHA
              setRecaptchaError(""); // Clear previous errors
            }}
            onExpire={() => {
              setRecaptchaToken(""); // Reset token if expired
              setRecaptchaError("reCAPTCHA expired. Please try again.");
            }}
            onError={() => {
              setRecaptchaToken(""); // Reset token if widget fails
              setRecaptchaError("reCAPTCHA failed to load.");
            }}
          />

          {recaptchaError && (
            <p className="text-sm text-red-600 text-center">
              {recaptchaError}
            </p>
          )}
        </div>

        <LoginSubmitButton loading={loading}>
          Access Admin Portal
        </LoginSubmitButton>
      </form>
    </LoginPageTemp>
  );
}

AdminLoginPage.noLayout = true;