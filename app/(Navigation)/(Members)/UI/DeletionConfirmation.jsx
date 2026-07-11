"use client";
import { useUserAuth } from "@/app/_utils/auth-context";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function deleteMember(memberID) {
  try {
    const res = await fetch(`/api/member-info?memberID=${memberID}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Delete failed");
    }

    console.log("Deleted:", data);
  } catch (error) {
    console.error("Error deleting member:", error);
  }
}

export function DeletionConfirmation({ onCancel }) {
    const { user, firebaseSignOut } = useUserAuth();
    const [emailInput, setEmailInput] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleDelete = () => {
        if (emailInput.toLowerCase() === user?.email.toLowerCase()) {
            deleteMember(user.uid);
            firebaseSignOut();
            router("/");
        } else {
            setError("Email does not match. Please enter your email to confirm.");
        }
    }

    {/* Account Deletion Confirmation Model */}
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto">
                <h2 className="text-xl font-semibold mb-4 text-black">Confirm Account Deletion</h2>
                <p className="mb-6 text-gray-700">Are you sure you want to delete your account? This action cannot be undone.</p>
                <div className="flex justify-end gap-4">
                    <form className="w-full">
                        <input
                            type="text"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="Enter your email to confirm"
                            className="w-full rounded-lg border bg-white px-4 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-[#556B2F]/50"
                        />
                        {error && (
                            <div className="rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm px-4 py-2 text-center mt-5">
                                {error}
                            </div>
                        )}
                        <section className="w-full flex flex-row items-center gap-4 mt-5">
                            <button
                            onClick={() => {
                                if (typeof onCancel === 'function') onCancel();
                            }}
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
                            > Cancel</button>
                            <button
                                type="submit"
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                            > Delete</button>
                        </section>
                    </form>
                </div>
            </div>
        </div>
    );
}