"use client";

import { Field, Divider } from "./FormUI";
import PasswordField from "../../UI/PasswordField";

export default function MemberInfoSection({ form, errors, touched, REQUIRED, setField, passwordChecks }) {
  const nameFields = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "preferredName", label: "Preferred Name", placeholder: "If different from first name" },
    { key: "birthday", label: "Birthday", type: "date", placeholder: "YYYY-MM-DD" },
  ];

  const addressFields = [
    { key: "address", label: "Address", className: "sm:col-span-2" },
    { key: "city", label: "City" },
    { key: "postalCode", label: "Postal Code", placeholder: "eg. A1A 1A1" },
  ];

  const contactFields = [
    { key: "email", label: "Email Address" },
    { key: "phone", label: "Phone Number", placeholder: "XXX-XXX-XXXX" },
  ];

  const renderFields = (fields) =>
    fields.map((f) => (
      <Field
        key={f.key}
        label={f.label}
        placeholder={f.placeholder}
        value={form[f.key]}
        onChange={setField(f.key)}
        required={REQUIRED.has(f.key)}
        className={f.className || ""}
        type={f.type || "text"}
        error={touched[f.key] ? errors[f.key] : ""}
        errorKey={f.key}
      />
    ));

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{renderFields(nameFields)}</div>

      <Divider />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{renderFields(addressFields)}</div>

      <Divider />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{renderFields(contactFields)}</div>
    
      <div>
          <label className="mb-1 block text-sm font-medium text-black">
            Password {REQUIRED.has("password") && <span className="text-red-600">*</span>}
          </label>

          <PasswordField
            placeholder="Password"
            value={form.password}
            onChange={setField("password")}
            error={touched.password ? errors.password : ""}
          >
            <div className="mt-2 space-y-1 text-xs">
              <p className={passwordChecks.minLength ? "text-green-600" : "text-black/60"}>
                {passwordChecks.minLength ? "✓" : "•"} At least 8 characters
              </p>
              <p className={passwordChecks.hasUpper ? "text-green-600" : "text-black/60"}>
                {passwordChecks.hasUpper ? "✓" : "•"} One uppercase letter
              </p>
              <p className={passwordChecks.hasLower ? "text-green-600" : "text-black/60"}>
                {passwordChecks.hasLower ? "✓" : "•"} One lowercase letter
              </p>
              <p className={passwordChecks.hasNumber ? "text-green-600" : "text-black/60"}>
                {passwordChecks.hasNumber ? "✓" : "•"} One number
              </p>
              <p className={passwordChecks.hasSpecial ? "text-green-600" : "text-black/60"}>
                {passwordChecks.hasSpecial ? "✓" : "•"} One special character
              </p>
            </div>
          </PasswordField>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-black">
            Confirm Password {REQUIRED.has("confirmPassword") && <span className="text-red-600">*</span>}
          </label>

          <PasswordField
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={setField("confirmPassword")}
            error={touched.confirmPassword ? errors.confirmPassword : ""}
          />
      </div>
    </>
  );
}