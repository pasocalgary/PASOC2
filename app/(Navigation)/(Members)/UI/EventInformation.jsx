"use client";

import { useUserAuth } from "@/app/_utils/auth-context";
import { useEffect, useRef, useState } from "react";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadIcs,
} from "@/app/_utils/calendarLinks";

export function EventInformation({
  title,
  date,
  time,
  endTime,
  description,
  location,
  link,
  imageUrl,
  startDatetime,
  endDatetime,
  eventId,
  onClose,
}) {
  const { user } = useUserAuth();

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Image viewer: FLIP animation from the thumbnail's on-screen position/size
  const [viewerOpen, setViewerOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [originRect, setOriginRect] = useState(null);
  const thumbRef = useRef(null);
  const viewerImgRef = useRef(null);

  const openImageViewer = () => {
    if (thumbRef.current) setOriginRect(thumbRef.current.getBoundingClientRect());
    setClosing(false);
    setViewerOpen(true);
  };

  const closeImageViewer = () => setClosing(true);

  // Animate in: jump to the thumbnail's rect, then transition to identity
  useEffect(() => {
    if (!viewerOpen || !originRect || !viewerImgRef.current) return;
    const img = viewerImgRef.current;
    const finalRect = img.getBoundingClientRect();
    const dx = originRect.left + originRect.width / 2 - (finalRect.left + finalRect.width / 2);
    const dy = originRect.top + originRect.height / 2 - (finalRect.top + finalRect.height / 2);
    const sx = originRect.width / finalRect.width;
    const sy = originRect.height / finalRect.height;
    img.style.transition = "none";
    img.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    img.getBoundingClientRect(); // force reflow before animating
    requestAnimationFrame(() => {
      img.style.transition = "transform 300ms ease";
      img.style.transform = "translate(0, 0) scale(1, 1)";
    });
  }, [viewerOpen, originRect]);

  // Animate out: transition back to the thumbnail's rect, then unmount
  useEffect(() => {
    if (!closing || !originRect || !viewerImgRef.current) return;
    const img = viewerImgRef.current;
    const finalRect = img.getBoundingClientRect();
    const dx = originRect.left + originRect.width / 2 - (finalRect.left + finalRect.width / 2);
    const dy = originRect.top + originRect.height / 2 - (finalRect.top + finalRect.height / 2);
    const sx = originRect.width / finalRect.width;
    const sy = originRect.height / finalRect.height;
    img.style.transition = "transform 300ms ease";
    img.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    const timer = setTimeout(() => {
      setViewerOpen(false);
      setClosing(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [closing, originRect]);

  const isLoggedIn = !!user;

  const calendarEvent = startDatetime
    ? {
        title,
        description,
        location,
        start: new Date(startDatetime),
        end: endDatetime ? new Date(endDatetime) : null,
      }
    : null;

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
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 shadow-lg max-w-md sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-gray-500 hover:text-black text-lg"
        >
          ✕
        </button>

        <div className="sm:flex sm:gap-6">
          {/* MEDIA COLUMN: poster + map */}
          {(imageUrl || (isLoggedIn && location)) && (
            <div className="sm:w-2/5 sm:shrink-0">
              {imageUrl && (
                <img
                  ref={thumbRef}
                  src={imageUrl}
                  alt={title}
                  onClick={openImageViewer}
                  className="w-full h-40 sm:h-auto sm:max-h-64 object-cover rounded-md mb-4 cursor-pointer"
                />
              )}

              {isLoggedIn && location && (
                <div className="mb-4">
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=embed`}
                    className="w-full h-40 rounded-md border-0"
                    loading="lazy"
                    title="Event location map"
                  />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#556B2F] underline"
                  >
                    Get Directions
                  </a>
                </div>
              )}
            </div>
          )}

          {/* DETAILS COLUMN: text + actions */}
          <div className="sm:flex-1 sm:min-w-0">
            <h2 className="text-xl font-bold mb-4">{title}</h2>

            <p><strong>Date:</strong> {date}</p>
            <p><strong>Time:</strong> {time}{endTime ? ` – ${endTime}` : ""}</p>

            {isLoggedIn && (
              <p><strong>Location:</strong> {location}</p>
            )}

            <p className="mt-2"><strong>Description:</strong> {description}</p>

            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm font-semibold text-white bg-[#556B2F] px-3 py-1.5 rounded-md hover:bg-[#445622]"
              >
                View Link ↗
              </a>
            )}

            {calendarEvent && (
              <div className="relative mt-3">
                <button
                  type="button"
                  onClick={() => setShowCalendarMenu((v) => !v)}
                  className="w-full border border-[#556B2F] text-[#556B2F] font-semibold py-2 rounded-lg hover:bg-[#f0ece1] transition"
                >
                  Add to Calendar
                </button>
                {showCalendarMenu && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <a
                      href={buildGoogleCalendarUrl(calendarEvent)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Google Calendar
                    </a>
                    <a
                      href={buildOutlookCalendarUrl(calendarEvent)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Outlook
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        downloadIcs(calendarEvent);
                        setShowCalendarMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Apple / iCal (.ics)
                    </button>
                  </div>
                )}
              </div>
            )}

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
      </div>

      {/* IMAGE VIEWER: tap image to expand, tap outside to return */}
      {viewerOpen && imageUrl && (
        <div
          className={`fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 transition-opacity duration-300 ${
            closing ? "opacity-0" : "opacity-100"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            closeImageViewer();
          }}
        >
          <img
            ref={viewerImgRef}
            src={imageUrl}
            alt={title}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-md"
          />
        </div>
      )}
    </div>
  );
}