"use client";

import { HeroSection } from "@/app/(Navigation)/(Members)/UI/HeroSection";
import { useUserAuth } from "../../../_utils/auth-context";
import { DeletionConfirmation } from "../UI/DeletionConfirmation";
import { useState, useEffect } from "react";
import { Skeleton } from "@/app/_components/Skeleton";
import { validateField } from "../../../_utils/membershipFormValidators";
import { sanitizeByKey, toTitleCase } from "../../../_utils/membershipFormSanitizers";
import { GoogleAuthProvider, linkWithPopup } from "firebase/auth";
import { auth } from "../../../_utils/firebase";

async function getMemberInfo(user) {
  const token = await user.getIdToken();
  const memberID = user.uid;

  const res = await fetch(`/api/member-info?memberID=${memberID}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.error || "Failed to fetch member info");
  }

  return result.data?.[0] || null;
}

export default function Profile() {
  const { user, firebaseSignOut } = useUserAuth();

  const [member, setMember] = useState(null);
  const [deletionClicked, setDeletionClicked] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    postalCode: "",
    primaryPhone: "",
  });

  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [googleLinkError, setGoogleLinkError] = useState("");
  const [googleLinkSuccess, setGoogleLinkSuccess] = useState("");
  const [linkedGoogleEmail, setLinkedGoogleEmail] = useState("");

  const profileRequiredFields = new Set();

  function validateProfileField(key, value, currentForm) {
    const v = typeof value === "string" ? value.trim() : value;

    if (key === "name" && v) {
      const fullNameRegex = /^[A-Za-zÀ-ÿ' -]+$/;
      if (!fullNameRegex.test(v)) {
        return "Name can only contain letters, spaces, apostrophes, and hyphens.";
      }
    }

    if (key === "primaryPhone" && v) {
      const digits = String(v).replace(/\D/g, "");
      if (digits.length !== 10) {
        return "Enter a valid 10 digit phone number.";
      }
    }

    return validateField(key, value, currentForm, profileRequiredFields);
  }

  function handleChange(e) {
    const { name, value } = e.target;

    let sanitizedValue = value;

    if (name === "name") {
      sanitizedValue = toTitleCase(value);
    } else {
      sanitizedValue = sanitizeByKey(name, value);
    }

    const nextForm = {
      ...formData,
      [name]: sanitizedValue,
    };

    setFormData(nextForm);

    const error = validateProfileField(name, sanitizedValue, nextForm);

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }

  function getLinkedGoogleEmail(currentUser) {
    if (!currentUser?.providerData?.length) return "";

    const googleProvider = currentUser.providerData.find(
      (provider) => provider.providerId === "google.com"
    );

    return googleProvider?.email || "";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!member?.uuid || !user) return;

    const newErrors = {
      name: validateProfileField("name", formData.name, formData),
      address: validateProfileField("address", formData.address, formData),
      postalCode: validateProfileField("postalCode", formData.postalCode, formData),
      primaryPhone: validateProfileField("primaryPhone", formData.primaryPhone, formData),
    };

    setErrors(newErrors);
    setSaveMessage("");
    setSaveError("");

    const hasErrors = Object.values(newErrors).some((error) => error);
    if (hasErrors) return;

    setSaving(true);

    try {
      const token = await user.getIdToken();

      const res = await fetch("/api/member-info", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uuid: member.uuid,
          ...formData,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("PATCH error:", result);
        throw new Error(result.error || "Update failed");
      }

      const updatedMember = await getMemberInfo(user);
      setMember(updatedMember);
      setSaveMessage("Profile updated successfully.");
    } catch (error) {
      console.error("Profile update error:", error);
      setSaveError(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleLinkGoogle() {
    if (!user) return;

    setGoogleLinkError("");
    setGoogleLinkSuccess("");
    setLinkingGoogle(true);

    try {
      const provider = new GoogleAuthProvider();
      const currentUser = auth.currentUser || user;

      await linkWithPopup(currentUser, provider);

      const refreshedUser = auth.currentUser || currentUser;
      const googleEmail = getLinkedGoogleEmail(refreshedUser);

      setLinkedGoogleEmail(googleEmail);
      setGoogleLinkSuccess("Google account linked successfully.");
    } catch (error) {
      console.error("Google link error:", error);

      if (error.code === "auth/provider-already-linked") {
        setGoogleLinkError("Google is already linked to this account.");
      } else if (error.code === "auth/credential-already-in-use") {
        setGoogleLinkError("That Google account is already linked to another account.");
      } else if (error.code === "auth/popup-closed-by-user") {
        setGoogleLinkError("Google linking was cancelled.");
      } else if (error.code === "auth/requires-recent-login") {
        setGoogleLinkError("Please sign in again before linking Google.");
      } else {
        setGoogleLinkError("Failed to link Google account.");
      }
    } finally {
      setLinkingGoogle(false);
    }
  }

  useEffect(() => {
    async function fetchMember() {
      if (!user) {
        setMember(null);
        return;
      }

      try {
        const memberData = await getMemberInfo(user);
        setMember(memberData);
      } catch (error) {
        console.error(error);
        setMember(null);
      }
    }

    fetchMember();
  }, [user]);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || "",
        address: member.address || "",
        postalCode: member.postalCode || "",
        primaryPhone: member.primaryPhone || "",
      });
    }
  }, [member]);

  useEffect(() => {
    if (user) {
      setLinkedGoogleEmail(getLinkedGoogleEmail(user));
    } else {
      setLinkedGoogleEmail("");
    }
  }, [user]);

  const inputStyle =
    "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none shadow-sm transition focus:border-[#556B2F]/40 focus:ring-4 focus:ring-[#556B2F]/10";

  const detailRowStyle =
    "flex items-start justify-between gap-4 border-b border-black/5 py-3";
  const detailLabelStyle = "text-sm font-medium text-black/55";
  const detailValueStyle = "text-sm text-black text-right";

  return (
    <main className="bg-[#f7f8f4] min-h-screen">
      <HeroSection
        title="Your Profile"
        description="View and manage your profile information, including your name, email, and membership details. Update your preferences and stay connected with the PASOC community."
      />

      {user ? (
        <>
          {/* PROFILE INFORMATION DISPLAY */}
          <section className="px-6 py-12 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-black/5">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-black">
                      Profile Information
                    </h2>
                    <p className="text-sm text-black/55 mt-1">
                      Your account and membership details.
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[#556B2F]/10 flex items-center justify-center text-[#556B2F] font-bold text-lg">
                    {member?.name?.[0] || "P"}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={detailRowStyle}>
                    <span className={detailLabelStyle}>Name</span>
                    <span className={detailValueStyle}>{member?.name || <Skeleton className="h-4 w-32" />}</span>
                  </div>
                  <div className={detailRowStyle}>
                    <span className={detailLabelStyle}>Email</span>
                    <span className={detailValueStyle}>{member?.email || <Skeleton className="h-4 w-40" />}</span>
                  </div>
                  <div className={detailRowStyle}>
                    <span className={detailLabelStyle}>Date of Birth</span>
                    <span className={detailValueStyle}>
                      {member?.dateOfBirth ? member.dateOfBirth.split("T")[0] : <Skeleton className="h-4 w-24" />}
                    </span>
                  </div>
                  <div className={detailRowStyle}>
                    <span className={detailLabelStyle}>Address</span>
                    <span className={detailValueStyle}>{member?.address || <Skeleton className="h-4 w-36" />}</span>
                  </div>
                  <div className={detailRowStyle}>
                    <span className={detailLabelStyle}>Postal Code</span>
                    <span className={detailValueStyle}>{member?.postalCode || <Skeleton className="h-4 w-20" />}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-3">
                    <span className={detailLabelStyle}>Primary Phone</span>
                    <span className={detailValueStyle}>{member?.primaryPhone || <Skeleton className="h-4 w-28" />}</span>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-[#f8faf5] border border-[#556B2F]/10 p-5">
                  <h3 className="text-lg font-semibold text-black">
                    Google Sign-In
                  </h3>
                  <p className="mt-1 text-sm text-black/60">
                    Link Google so you can use either email/password or Google to sign in.
                  </p>

                  {linkedGoogleEmail ? (
                    <div className="mt-4 rounded-2xl bg-white border border-green-200 px-4 py-3">
                      <p className="text-sm font-medium text-green-700">
                        Google Email Linked: {linkedGoogleEmail}
                      </p>
                    </div>
                  ) : (
                    <>
                      {googleLinkError && (
                        <p className="mt-4 text-sm text-red-600">{googleLinkError}</p>
                      )}

                      {googleLinkSuccess && (
                        <p className="mt-4 text-sm text-green-600">{googleLinkSuccess}</p>
                      )}

                      <button
                        onClick={handleLinkGoogle}
                        disabled={linkingGoogle}
                        className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[#556B2F] px-5 py-3 text-sm font-medium text-white shadow-md transition hover:bg-[#445622] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {linkingGoogle ? "Linking Google..." : "Link Google Account"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* PROFILE EDITING */}
              <div className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-black/5">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-black">
                    Edit Profile Information
                  </h2>
                  <p className="text-sm text-black/55 mt-1">
                    Update your contact and profile details below.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <input
                      name="name"
                      type="text"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleChange}
                      className={inputStyle}
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <input
                      name="address"
                      type="text"
                      placeholder="Address"
                      value={formData.address}
                      onChange={handleChange}
                      className={inputStyle}
                    />
                    {errors.address && (
                      <p className="mt-2 text-sm text-red-600">{errors.address}</p>
                    )}
                  </div>

                  <div>
                    <input
                      name="postalCode"
                      type="text"
                      placeholder="Postal Code"
                      value={formData.postalCode}
                      onChange={handleChange}
                      className={inputStyle}
                    />
                    {errors.postalCode && (
                      <p className="mt-2 text-sm text-red-600">{errors.postalCode}</p>
                    )}
                  </div>

                  <div>
                    <input
                      name="primaryPhone"
                      type="text"
                      placeholder="Primary Phone"
                      value={formData.primaryPhone}
                      onChange={handleChange}
                      className={inputStyle}
                    />
                    {errors.primaryPhone && (
                      <p className="mt-2 text-sm text-red-600">{errors.primaryPhone}</p>
                    )}
                  </div>

                  {saveError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {saveError}
                    </div>
                  )}

                  {saveMessage && (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {saveMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-2xl bg-[#7E9A45] text-white py-3.5 shadow-md transition hover:bg-[#728b40] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* ACCOUNT SIGN OUT */}
          <section className="px-6 max-w-7xl mx-auto">
            <div className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-black/5 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold text-black">Account Access</h3>
                <p className="text-sm text-black/60 mt-1">
                  Sign out of your current PASOC account.
                </p>
              </div>

              <button
                onClick={firebaseSignOut}
                className="px-6 py-3 rounded-2xl bg-gray-600 text-white hover:bg-gray-700 transition"
              >
                Sign Out
              </button>
            </div>
          </section>

          {/* ACCOUNT DELETION */}
          <section className="px-6 py-12 max-w-7xl mx-auto">
            <div className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-red-100">
              <div className="max-w-3xl">
                <h3 className="text-2xl font-semibold text-red-600">
                  Delete Account
                </h3>
                <p className="mt-3 text-base text-gray-700">
                  Moving on from PASOC? We understand that circumstances change.
                  If you wish to delete your account, please be aware that this
                  action is irreversible and will permanently remove all your data
                  from our system.
                </p>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setDeletionClicked(true)}
                  className="px-6 py-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition"
                >
                  Delete Account
                </button>
              </div>

              {deletionClicked && (
                <DeletionConfirmation
                  onCancel={() => setDeletionClicked(false)}
                />
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="flex flex-col items-center gap-6 px-6 py-12 max-w-8xl mx-auto">
          <div className="rounded-3xl bg-white p-10 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-black/5 text-center max-w-2xl w-full">
            <h2 className="text-2xl font-semibold text-black">
              Please log in to view your profile information.
            </h2>
          </div>
        </section>
      )}
    </main>
  );
}