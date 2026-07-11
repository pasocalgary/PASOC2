"use client";
import { useState } from "react";
import { useUserAuth } from '../../../_utils/auth-context';
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoginPageTemp from "../components/LoginPageTemp";
import InputFields from "../components/InputFields";
import PasswordField from "../components/PasswordField";
import LoginSubmitButton from "../components/LoginSubmitButton";
import SocialLoginButtons from "../components/SocialLoginButtons";
import { getFirebaseErrorMessage, validateLoginForm } from "../../../_utils/loginHelpers";
import { Divider } from "../Membership/components/FormUI";
import RecaptchaWidget from "../components/RecaptchaWidget";
import { verifyRecaptchaToken } from "../../../_utils/Recaptcha"

export default function LoginPage() {
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const { emailSignIn, googleSignIn, facebookSignIn, resetPassword, firebaseSignOut } = useUserAuth();
  const [loading, setLoading] = useState(false); // Prevent multiple clicks on login button while processing
  const [recaptchaToken, setRecaptchaToken] = useState(""); // Stores reCAPTCHA token once user completes verification
  const [recaptchaError, setRecaptchaError] = useState("");
  const router = useRouter();

  // Check if Firebase user exists in MemberInfo table
  const checkIfMember = async (firebaseUser) => {
    const token = await firebaseUser.getIdToken();

    const res = await fetch("/api/member-info", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to verify membership.");
    }

    return !!data.isMember || (Array.isArray(data.data) && data.data.length > 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevents resubmission if already processing
    if (loading) return;

    // Run shared validation from utils
    const validationError = validateLoginForm(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Ensures that user completes reCAPTCHA before attempting to login
    if (!recaptchaToken) {
      setRecaptchaError("Please complete the reCAPTCHA.");
      return;
    }
    
    // Verifies token with backend before proceeding
    const recaptchaResult = await verifyRecaptchaToken(recaptchaToken);

    if (!recaptchaResult.success) {
      setRecaptchaToken(""); // Resets if verification fails
      setRecaptchaError("reCAPTCHA verification failed. Try again.");
      return;
    }

    // If everything is fine, clear the error and proceed (e.g., redirect to dashboard)
    setError("");
    setLoading(true);

    try {
      await emailSignIn(email, password);
      router.push('/');
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;

    setError("");
    setLoading(true);
    try {
      const result = await googleSignIn();
      const signedInUser = result?.user;

      // Ensure user object exists
      if (!signedInUser) {
        throw new Error("Google sign-in failed.");
      }

      // Check if user exists in MemberInfo
      const isMember = await checkIfMember(signedInUser);

      // If NOT a member → sign out + show message
      if (!isMember) {
        await firebaseSignOut();
        setError("No member account found. Please sign up first.");
        return;
      }

      // If member → continue
      router.push('/');
    } catch (err) {
      setError(
        err.code
          ? getFirebaseErrorMessage(err.code)
          : err.message || "Google sign-in failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    if (loading) return;

    setError("");
    setLoading(true);
    try {
      await facebookSignIn();
      router.push('/');
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }
    try{
      await resetPassword(email);
      setError("Password reset email sent.");
    } catch (err) {
        setError(getFirebaseErrorMessage(err.code));
      }
    }

  return (
    <LoginPageTemp backHref="/">
      {/* LOGIN Title */}
      <div className="text-center mb-6">
        <h1 className="font-serif font-extrabold text-4xl text-[#556B2F] tracking-wide">
          LOGIN
        </h1>
        <Divider />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col items-center"
        noValidate
      >
        <div className="w-full max-w-115 space-y-6">
          <InputFields
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(""); // Clear error when user starts typing
            }}
          />

          <PasswordField
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
          />

          {error && (
            <div className="rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm px-4 py-2 text-center">
              {error}
            </div>
          )}

          {/* Remember + Forgot Password */}
          <div className="flex items-center justify-between text-xs text-black/70">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-[#556B2F]" />
              Remember me
            </label>

          <Link
            href="/Login/ForgotPassword"
            className="text-sm text-emerald-700 hover:underline"
          >
            Forgot Password?
          </Link>
            </div>
          </div>

        <div className="mt-4 space-y-2">
          <RecaptchaWidget
            onVerify={(token) => {
              setRecaptchaToken(token);
              setRecaptchaError("");
            }}
            onExpire={() => {
              setRecaptchaToken("");
              setRecaptchaError("reCAPTCHA expired. Please try again.");
            }}
            onError={() => {
              setRecaptchaToken("");
              setRecaptchaError("reCAPTCHA failed to load.");
            }}
          />

          {recaptchaError && (
            <p className="text-sm text-red-600 text-center">
              {recaptchaError}
            </p>
          )}
        </div>
        
        <LoginSubmitButton loading={loading} loadingText="Logging in...">
          Log In
        </LoginSubmitButton>

        {/* Sign up */}
        <a
          href="/Login/Membership"
          className="mt-4 text-sm text-blue-700 font-semibold hover:underline"
        >
          Sign Up
        </a>

        {/* Divider */}
        <div className="mt-6 w-full max-w-130 flex items-center gap-3">
          <div className="flex-1 h-px bg-black/20" />
          <span className="text-xs text-black/60">or log in with</span>
          <div className="flex-1 h-px bg-black/20" />
        </div>
      </form>

      <SocialLoginButtons
        onFacebook={handleFacebookSignIn}
        onGoogle={handleGoogleSignIn}
        disabled={loading}
      />
    </LoginPageTemp>
  );
}

LoginPage.noLayout = true; // This tells the RootLayout to not render the Header and Footer for this page.