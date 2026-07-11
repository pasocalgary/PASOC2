"use client";

import { useUserAuth } from "@/app/_utils/auth-context";
import { useEffect, useState } from "react";

export function EventInformation({
  title,
  date,
  time,
  description,
  location,
  eventId,
  onClose,
}) {
  const { user } = useUserAuth();

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isLoggedIn = !!user;

  // Check registration
  useEffect(() => {
    async function checkRegistration() {
      if (!user || !eventId) {
        setChecking(false);
        return;
      }

      try {
        const token = await user.getIdToken();

        const res = await fetch(
          `/api/event-registration?eventId=${eventId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (res.ok && data.data?.length > 0) {
          setIsRegistered(true);
        } else {
          setIsRegistered(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    }

    checkRegistration();
  }, [user, eventId]);

  // Register
  const handleRegister = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const token = await user.getIdToken();

      const res = await fetch("/api/event-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to register");
        return;
      }

      setIsRegistered(true);
      setSuccessMessage("Successfully registered 🎉");
    } catch (err) {
      console.error(err);
      setErrorMessage("Error registering");
    } finally {
      setLoading(false);
    }
  };

  // Cancel
  const handleCancel = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const token = await user.getIdToken();

      const res = await fetch(
        `/api/event-registration?eventId=${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to cancel");
        return;
      }

      setIsRegistered(false);
      setSuccessMessage("Registration cancelled");
    } catch (err) {
      console.error(err);
      setErrorMessage("Error cancelling");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-gray-500 hover:text-black text-lg"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">{title}</h2>

        <p><strong>Date:</strong> {date}</p>
        <p><strong>Time:</strong> {time}</p>

        {isLoggedIn && (
          <p><strong>Location:</strong> {location}</p>
        )}

        <p><strong>Description:</strong> {description}</p>

        {/* AUTH UI */}
        {isLoggedIn ? (
          <div className="mt-4 flex flex-col gap-2">
            {checking ? (
              <p className="text-sm text-gray-500">Checking registration...</p>
            ) : isRegistered ? (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {loading ? "Cancelling..." : "Cancel Registration"}
              </button>
            ) : (
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-[#556B2F] text-white py-2 rounded-lg hover:bg-[#445622] transition disabled:opacity-50"
              >
                {loading ? "Registering..." : "Register"}
              </button>
            )}

            {/* ERROR MESSAGE */}
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            {/* SUCCESS MESSAGE */}
            {successMessage && (
              <p className="text-sm text-green-600">{successMessage}</p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500 italic">
            Login to view location and register for this event.
          </p>
        )}
      </div>
    </div>
  );
}