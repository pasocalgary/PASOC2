"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Divider, SectionTitle } from "./components/FormUI";
import MemberInfoSection from "./components/MemberInfoSection";
import AdditionalInfoSection from "./components/AdditionalInfoSection";
import ConsentSection from "./components/ConsentSection";
import EmailNotificationsSection from "./components/EmailNotificationsSection";
import DependantsSection from "./components/DependantsSection";

import { REQUIRED_FIELDS, initialMembershipForm } from "../../../_utils/membershipFormConfig";
import { sanitizeByKey } from "../../../_utils/membershipFormSanitizers";
import { getPasswordChecks, validateField, validateAll } from "../../../_utils/membershipFormValidators";

import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../_utils/firebase";
import { Skeleton } from "@/app/_components/Skeleton";

// ─── Age helper (no pricing dependency — safe outside component) ──────────────
const getAge = (birthday) => {
  if (!birthday) return null;
  const today = new Date();
  const dob = new Date(birthday);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};
// ─────────────────────────────────────────────────────────────────────────────

export default function MembershipForm() {
  const REQUIRED = useMemo(() => new Set(REQUIRED_FIELDS), []);

  const [form, setForm] = useState(initialMembershipForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // ─── Pricing state — fetched from DB ────────────────────────────────────────
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    fetch("/api/pricing")
      .then((res) => res.json())
      .then((data) => {
        if (data.memberPrice && data.dependantPrice) {
          setPricing(data);
        }
      })
      .catch(() => console.error("Failed to fetch pricing"));
  }, []);
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Pricing helpers (inside component — depend on pricing state) ────────────
  const getMemberFee = (birthday) => {
    if (!pricing) return 0;
    const age = getAge(birthday);
    const memberPrice = parseFloat(pricing.memberPrice);
    const dependantPrice = parseFloat(pricing.dependantPrice);
    if (age === null) return memberPrice;
    return age < 18 ? dependantPrice : memberPrice;
  };

  const calculateMembershipTotal = (f) => {
    const memberFee = getMemberFee(f.birthday);
    const dependantFees =
      f.hasChildren === "yes"
        ? f.dependants.reduce((sum, dep) => sum + getMemberFee(dep.birthday), 0)
        : 0;
    return memberFee + dependantFees;
  };

  const buildPricingDescription = (f) => {
    if (!pricing) return "Loading pricing...";
    const memberAge = getAge(f.birthday);
    const memberType = memberAge !== null && memberAge < 18 ? "Youth" : "Adult";
    const memberFee = getMemberFee(f.birthday);
    let desc = `${memberType} member: $${memberFee.toFixed(2)}`;
    if (f.hasChildren === "yes" && f.dependants.length > 0) {
      f.dependants.forEach((dep, i) => {
        const depAge = getAge(dep.birthday);
        const depType = depAge !== null && depAge < 18 ? "Youth" : "Adult";
        const depFee = getMemberFee(dep.birthday);
        desc += ` | Dependant ${i + 1} (${depType}): $${depFee.toFixed(2)}`;
      });
    }
    return desc;
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const passwordChecks = getPasswordChecks(form.password);
  const membershipTotal = calculateMembershipTotal(form);
  const pricingDescription = buildPricingDescription(form);

  const setField = (key) => (e) => {
    const isCheckbox = e.target.type === "checkbox";
    const rawValue = isCheckbox ? e.target.checked : e.target.value;
    const value = isCheckbox ? rawValue : sanitizeByKey(key, rawValue);

    setForm((prev) => {
      const nextForm = { ...prev, [key]: value };

      setTouched((t) => ({ ...t, [key]: true }));

      setErrors((errs) => {
        const updatedErrors = {
          ...errs,
          [key]: validateField(key, value, nextForm, REQUIRED),
        };

        if (key === "password") {
          updatedErrors.confirmPassword = validateField(
            "confirmPassword",
            nextForm.confirmPassword,
            nextForm,
            REQUIRED
          );
        }

        if (key === "confirmPassword") {
          updatedErrors.password = validateField(
            "password",
            nextForm.password,
            nextForm,
            REQUIRED
          );
        }

        return updatedErrors;
      });

      if (key === "hasChildren" && value === "no") {
        setErrors((errs) => {
          const copy = { ...errs };
          Object.keys(copy).forEach((k) => {
            if (k.startsWith("dep_")) delete copy[k];
          });
          return copy;
        });

        setTouched((t) => {
          const copy = { ...t };
          Object.keys(copy).forEach((k) => {
            if (k.startsWith("dep_")) delete copy[k];
          });
          return copy;
        });
      }

      return nextForm;
    });
  };

  const updateDependant = (index, field, rawValue) => {
    const value = sanitizeByKey(field === "birthday" ? "birthday" : field, rawValue);

    setForm((prev) => {
      const nextDependants = prev.dependants.map((dependant, i) =>
        i === index ? { ...dependant, [field]: value } : dependant
      );

      const nextForm = { ...prev, dependants: nextDependants };

      if (nextForm.hasChildren === "yes") {
        const errorKey = `dep_${index}_${field}`;
        setTouched((t) => ({ ...t, [errorKey]: true }));
        setErrors((errs) => ({
          ...errs,
          [errorKey]: String(value).trim() ? "" : "Required",
        }));
      }

      return nextForm;
    });
  };

  const addDependant = () => {
    setForm((prev) => ({
      ...prev,
      dependants: [
        ...prev.dependants,
        { firstName: "", lastName: "", birthday: "" },
      ],
    }));
  };

  const removeDependant = (index) => {
    setForm((prev) => ({
      ...prev,
      dependants: prev.dependants.filter((_, i) => i !== index),
    }));

    setErrors((errs) => {
      const copy = { ...errs };
      Object.keys(copy).forEach((k) => {
        if (k.startsWith(`dep_${index}_`)) delete copy[k];
      });
      return copy;
    });

    setTouched((t) => {
      const copy = { ...t };
      Object.keys(copy).forEach((k) => {
        if (k.startsWith(`dep_${index}_`)) delete copy[k];
      });
      return copy;
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  const touchThese = {};
  for (const key of REQUIRED) {
    touchThese[key] = true;
  }

  if (form.hasChildren === "yes") {
    form.dependants.forEach((_, i) => {
      touchThese[`dep_${i}_firstName`] = true;
      touchThese[`dep_${i}_lastName`] = true;
      touchThese[`dep_${i}_birthday`] = true;
    });
  }

  setTouched((t) => ({ ...t, ...touchThese }));

  const nextErrors = validateAll(form, REQUIRED);
  setErrors(nextErrors);

  if (Object.keys(nextErrors).length > 0) {
    setShowErrorModal(true);
    return;
  }

  // Text moderation for forms using Azure AI content safety
const moderationRes = await fetch("/api/moderate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fields: {
      firstName: form.firstName,
      lastName: form.lastName,
      preferredName: form.preferredName,
      currentOrgInvolvement: form.currentOrgInvolvement,
      positionsHeld: form.positionsHeld,
    },
    dependants: form.hasChildren === "yes" ? form.dependants : [],
  }),
});

const moderationData = await moderationRes.json();

if (!moderationRes.ok) {
  throw new Error(moderationData.error || "Moderation check failed.");
}

if (Object.keys(moderationData.moderationErrors).length > 0) {
  setErrors((prev) => ({
    ...prev,
    ...moderationData.moderationErrors,
  }));

  setShowErrorModal(true);
  return;
}

  setLoading(true);
  let firebaseUser = null;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
    firebaseUser = userCredential.user;
    const firebaseUID = firebaseUser.uid;

    console.log(`✅ Firebase user created: ${firebaseUID}`);

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: membershipTotal,
        type: "membership",
        metadata: {
          type: "membership",
          firebase_uid: firebaseUID,
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          date_of_birth: form.birthday,
          address: `${form.address}, ${form.city}`,
          postal_code: form.postalCode,
          price_id: String(pricing?.priceId ?? ""),
          dependants: String(form.hasChildren === "yes" ? form.dependants.length : 0),
          description: pricingDescription,
          ...Object.fromEntries(
            form.hasChildren === "yes"
              ? form.dependants.flatMap((dep, i) => [
                  [`dep_${i}_name`, `${dep.firstName} ${dep.lastName}`.trim()],
                  [`dep_${i}_dob`, dep.birthday],
                ])
              : []
          ),
        },
      }),
    });

    const data = await res.json();

    if (!data.url) {
      if (firebaseUser) await firebaseUser.delete();
      throw new Error("Checkout session failed to create");
    }

    window.location.href = data.url;
  } catch (err) {
    console.error(err);
    if (firebaseUser) {
      firebaseUser.delete().catch((e) => console.error("Cleanup failed:", e));
    }
    alert(`Error: ${err.message}`);
  }

  setLoading(false);
};

  // GUARD: don't render form until pricing is loaded
  if (!pricing) {
    return (
      <main className="min-h-dvh bg-[#F4EFE7] px-4 flex justify-center items-start md:items-center py-10">
        <div className="w-full max-w-160 bg-white/40 rounded-2xl p-6 sm:p-8 shadow-sm border border-black/10 flex flex-col gap-4">
          <Skeleton className="h-9 w-2/3 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl mt-2" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#F4EFE7] relative overflow-y-auto md:overflow-hidden">
      <Link href="/" className="absolute left-6 top-6" aria-label="Go back">
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

      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg border border-black/10">
            <h2 className="font-serif text-2xl text-[#556B2F]">
              Form is incomplete!
            </h2>
            <p className="mt-2 text-sm text-black/70">
              Some required fields are missing or invalid.
              <br /> Go back and complete the fields marked in red.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="rounded-xl bg-[#7E9A45] px-4 py-2 text-white hover:brightness-95"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-dvh px-4 flex justify-center items-start md:items-center py-10">
        <div className="w-full max-w-160 bg-white/40 rounded-2xl p-6 sm:p-8 shadow-sm border border-black/10">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#556B2F] tracking-wide text-center">
            Membership Registration
          </h1>

          <p className="text-center text-black mt-2 text-sm sm:text-base max-w-xl mx-auto">
            One-time membership fee of: <br />
            Adults (18+): ${parseFloat(pricing.memberPrice).toFixed(2)} <br />
            Youth (under 18): ${parseFloat(pricing.dependantPrice).toFixed(2)} <br />
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
            <SectionTitle className="mt-4">Member Information</SectionTitle>

            <MemberInfoSection
              form={form}
              errors={errors}
              touched={touched}
              REQUIRED={REQUIRED}
              setField={setField}
              passwordChecks={passwordChecks}
            />

            <DependantsSection
              form={form}
              errors={errors}
              touched={touched}
              setField={setField}
              updateDependant={updateDependant}
              addDependant={addDependant}
              removeDependant={removeDependant}
            />

            <AdditionalInfoSection
              form={form}
              errors={errors}
              touched={touched}
              REQUIRED={REQUIRED}
              setField={setField}
            />

            <ConsentSection
              form={form}
              errors={errors}
              touched={touched}
              setField={setField}
            />

            <EmailNotificationsSection
              form={form}
              errors={errors}
              touched={touched}
              setField={setField}
            />

            <Divider className="bg-black/40" />

            {/* Pricing summary — updates live as form fills in */}
            <div className="rounded-xl bg-white/60 border border-black/10 px-4 py-3 text-sm text-black/70 space-y-1">
              <p className="font-semibold text-black/80">Order Summary</p>
              <p>{pricingDescription}</p>
              <p className="font-bold text-[#556B2F] text-base">
                Total: ${membershipTotal.toFixed(2)} CAD
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7E9A45] text-white py-3 rounded-xl shadow-md hover:brightness-95 disabled:opacity-60 transition"
            >
              {loading ? "Redirecting to payment..." : "Continue to Payment"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}