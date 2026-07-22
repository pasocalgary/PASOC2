"use client";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { CalendarDays, Clock, MapPin, Image as ImageIcon, Link2, AlignLeft, Upload, X } from "lucide-react";
import { Skeleton } from "@/app/_components/Skeleton";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function formatDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function dayName(y, m, d) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(y, m, d).getDay()];
}

// Convert DB row → local event object
function normalise(row) {
  const dt = row.startDatetime ? new Date(row.startDatetime) : null;
  const endDt = row.endDatetime ? new Date(row.endDatetime) : null;
  return {
    id: row.eventId,
    title: row.title ?? "",
    startDatetime: row.startDatetime ?? "",
    endDatetime: row.endDatetime ?? "",
    description: row.description ?? "",
    location: row.location ?? "",
    link: row.link ?? "",
    imageUrl: row.imageUrl ?? "",
    // derived for calendar / display
    date: dt ? formatDateStr(dt.getFullYear(), dt.getMonth(), dt.getDate()) : "",
    time: dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "",
    timeDisplay: dt ? formatTimeDisplay(`${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`) : "",
    endTime: endDt ? `${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}` : "",
    endTimeDisplay: endDt ? formatTimeDisplay(`${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}`) : "",
  };
}

// Build a datetime string from date (YYYY-MM-DD) + time (HH:MM from time input)
function toDatetimeLocal(date, time) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

// Format stored datetime back to HH:MM for the time input
function toTimeInput(startDatetime) {
  if (!startDatetime) return "";
  const dt = new Date(startDatetime);
  if (isNaN(dt)) return "";
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

// Format HH:MM for display (e.g. "3:30 PM")
function formatTimeDisplay(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default function EventManagerPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    formatDateStr(today.getFullYear(), today.getMonth(), today.getDate())
  );

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    eventId: null,
    eventTitle: "",
  });

  // Clear form error when any field changes
  const updateField = (field, value) => {
    setFormError("");
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Form uses separate date + time inputs for usability, combined into startDatetime on submit
  const [formData, setFormData] = useState({
    title: "", date: "", time: "", endTime: "", description: "", location: "", link: "", imageUrl: "",
  });
  const [formError, setFormError] = useState("");

  // Location autocomplete (LocationIQ, proxied through /api/geocode)
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const suppressNextLocationFetch = useRef(false);

  useEffect(() => {
    if (suppressNextLocationFetch.current) {
      suppressNextLocationFetch.current = false;
      return;
    }
    const query = formData.location;
    if (!query || query.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.success) {
          setLocationSuggestions(json.data);
          setShowLocationSuggestions(true);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.location]);

  const handleSelectLocation = (displayName) => {
    suppressNextLocationFetch.current = true;
    updateField("location", displayName);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  };

  // Local preview until submit, when the file is uploaded to R2 (see handleSubmit)
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!imageFile) { setImagePreviewUrl(""); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const displayImage = imagePreviewUrl || formData.imageUrl;

  const handleImageFiles = (files) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) setImageFile(file);
  };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleImageDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageFiles(e.dataTransfer.files);
  };
  const handleRemoveImage = () => {
    setImageFile(null);
    updateField("imageUrl", "");
  };

  // ── Load events from DB ──
  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) { console.error("Load failed:", json.error); return; }
      setEvents(json.data.map(normalise));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Calendar data – weeks-based grid (matches Members calendar)
  const eventsByDate = useMemo(() => {
    const grouped = {};
    events.forEach((ev) => {
      if (ev.date) {
        if (!grouped[ev.date]) grouped[ev.date] = [];
        grouped[ev.date].push(ev);
      }
    });
    return grouped;
  }, [events]);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const key = formatDateStr(viewYear, viewMonth, day);
    return eventsByDate[key] || [];
  };

  const weeks = useMemo(() => {
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const result = [];
    let week = new Array(firstDay).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) { result.push(week); week = []; }
    }
    while (week.length < 7) week.push(null);
    if (!week.every((d) => d === null)) result.push(week);
    return result;
  }, [viewYear, viewMonth]);

  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const selParts = selectedDate.split("-").map(Number);
  const selDayName = dayName(selParts[0], selParts[1] - 1, selParts[2]);
  const selMonthName = MONTHS[selParts[1] - 1];
  const selLabel = `${selDayName}, ${selMonthName} ${selParts[2]}`;

  const upcomingEvents = useMemo(() => {
    return events
      .filter((ev) => ev.date >= selectedDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, selectedDate]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const openForm = (ev = null) => {
    suppressNextLocationFetch.current = true;
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    if (ev) {
      // editing — split startDatetime back into date + time inputs
      setFormData({
        title: ev.title,
        date: ev.date,
        time: ev.time,   // already HH:MM from normalise()
        endTime: ev.endTime,
        description: ev.description,
        location: ev.location,
        link: ev.link,
        imageUrl: ev.imageUrl,
      });
      setEditingEvent(ev);
    } else {
      setFormData({ title: "", date: selectedDate, time: "", endTime: "", description: "", location: "", link: "", imageUrl: "" });
      setEditingEvent(null);
    }
    setImageFile(null);
    setFormError("");
    setShowForm(true);
  };

  const handleModifyEvent = () => {
    if (upcomingEvents.length > 0) openForm(upcomingEvents[0]);
    else openForm();
  };

  // ── Validate form ──
  const getFormError = (data) => {
    if (!data.title.trim()) return "Event title is required.";
    if (!data.date) return "Date is required.";
    if (!data.time) return "Time is required.";
    if (!data.location.trim()) return "Location is required.";
    if (data.endTime && data.endTime <= data.time) return "End time must be after start time.";
    return "";
  };

  // ── Submit: POST (add) or PUT (edit) ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = getFormError(formData);
    if (error) { setFormError(error); return; }
    setFormError("");

    let imageUrl = formData.imageUrl;
    if (imageFile) {
      try {
        const uploadForm = new FormData();
        uploadForm.append("file", imageFile);
        const uploadRes = await fetch("/api/events/upload", { method: "POST", body: uploadForm });
        const uploadJson = await uploadRes.json();
        if (!uploadJson.success) { setFormError(uploadJson.error || "Image upload failed."); return; }
        imageUrl = uploadJson.url;
      } catch (err) {
        console.error(err);
        setFormError("Image upload failed.");
        return;
      }
    }

    const startDatetime = toDatetimeLocal(formData.date, formData.time);
    const endDatetime = formData.endTime ? toDatetimeLocal(formData.date, formData.endTime) : null;
    const payload = {
      title: formData.title,
      startDatetime,
      endDatetime,
      description: formData.description,
      location: formData.location,
      link: formData.link,
      imageUrl,
    };

    try {
      if (editingEvent) {
        const res = await fetch("/api/events", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingEvent.id, ...payload }),
        });
        const json = await res.json();
        if (!json.success) { console.error("Update failed:", json.error); return; }
      } else {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) { console.error("Create failed:", json.error); return; }
      }
      setShowForm(false);
      loadEvents();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Delete: open confirm first ──
  const handleDelete = () => {
    if (!editingEvent) return;
    setConfirmModal({ isOpen: true, eventId: editingEvent.id, eventTitle: editingEvent.title });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, eventId: null, eventTitle: "" });
  };

  const executeConfirmedDelete = async () => {
    try {
      const res = await fetch(`/api/events?id=${confirmModal.eventId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) { console.error("Delete failed:", json.error); return; }
      closeConfirmModal();
      setShowForm(false);
      loadEvents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0ece1] flex flex-col font-sans">
      <main className="flex-1 py-10">
        <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-[#556B2F] text-white rounded-xl p-3">
            <CalendarDays size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-serif text-[#556B2F]">Events</h1>
            <p className="text-sm text-[#556B2F]/60 mt-0.5">Event Manager</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8 mt-4">
          {/* Left Side: Upcoming Events */}
          <div className="w-full lg:w-auto lg:max-w-sm flex flex-col">
            <div className="mb-4">
              <div className="inline-block border border-[#2a2420] rounded-full px-6 py-2">
                <span className="font-serif text-lg font-semibold text-[#2a2420]">{selLabel}</span>
              </div>
            </div>

            <div className="border border-[#2a2420] rounded-lg p-4 bg-white min-h-[280px]">
              <h3 className="font-serif text-xl text-center underline underline-offset-4 font-semibold text-[#2a2420] mb-4">
                Upcoming Events
              </h3>
              {loading && (
                <div className="flex flex-col gap-1">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="border-b border-[#ccc] py-3 px-2">
                      <Skeleton className="h-4 w-2/3 mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              )}
              {!loading && upcomingEvents.length === 0 && (
                <p className="text-sm text-[#888] text-center mt-8">No upcoming events.</p>
              )}
              {!loading && upcomingEvents.map((ev) => {
                const d = new Date(ev.date + "T00:00:00");
                const monthName = MONTHS[d.getMonth()];
                return (
                  <div
                    key={ev.id}
                    className="border-b border-[#ccc] py-3 px-2 cursor-pointer hover:bg-[#f7f7d6] transition rounded"
                    onClick={() => openForm(ev)}
                  >
                    <div className="font-semibold text-[#2a2420]">{ev.title}</div>
                    <div className="text-sm text-[#2a2420]">
                      Date &amp; Time: {monthName} {String(d.getDate()).padStart(2, "0")}, {d.getFullYear()} {ev.timeDisplay}
                    </div>
                    <div className="text-sm text-[#2a2420]">Where: {ev.location}</div>
                    <div className="text-sm text-[#2a2420]">Description: {ev.description}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Calendar (full-grid style) */}
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#2a2420]">
                {MONTHS[viewMonth]} {viewYear}
              </h2>
              <div>
                <button
                  className="px-3 py-1 bg-[#556B2F] text-white rounded hover:bg-[#6b8a3a] mx-2"
                  onClick={prevMonth}
                >
                  &lt;
                </button>
                <button
                  className="px-3 py-1 bg-[#556B2F] text-white rounded hover:bg-[#6b8a3a] mx-2"
                  onClick={nextMonth}
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-0.5 sm:gap-2 text-center font-semibold mb-2 text-xs sm:text-base">
              <div><span className="hidden sm:inline">Sun</span><span className="sm:hidden">Su</span></div>
              <div><span className="hidden sm:inline">Mon</span><span className="sm:hidden">Mo</span></div>
              <div><span className="hidden sm:inline">Tue</span><span className="sm:hidden">Tu</span></div>
              <div><span className="hidden sm:inline">Wed</span><span className="sm:hidden">We</span></div>
              <div><span className="hidden sm:inline">Thu</span><span className="sm:hidden">Th</span></div>
              <div><span className="hidden sm:inline">Fri</span><span className="sm:hidden">Fr</span></div>
              <div><span className="hidden sm:inline">Sat</span><span className="sm:hidden">Sa</span></div>
            </div>

            <div
              className="grid grid-cols-7 gap-0.5 sm:gap-2"
              style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}
            >
              {weeks.map((week, i) =>
                week.map((day, j) => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div
                      key={`${i}-${j}`}
                      className="border border-gray-300 bg-gray-50 p-1 sm:p-2 flex flex-col items-center justify-start h-16 sm:h-28 lg:h-32 overflow-hidden cursor-pointer"
                      onClick={() => {
                        if (day) setSelectedDate(formatDateStr(viewYear, viewMonth, day));
                      }}
                    >
                      {day && (
                        <>
                          <span
                            className={`text-xs sm:text-sm font-semibold ${
                              day === todayDay &&
                              viewMonth === todayMonth &&
                              viewYear === todayYear
                                ? "bg-[#556B2F] text-white rounded-full w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center"
                                : ""
                            }`}
                          >
                            {day}
                          </span>
                          <div className="mt-0.5 sm:mt-2 flex flex-col gap-0.5 sm:gap-1 w-full">
                            {dayEvents.map((event) => (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openForm(event);
                                }}
                                className="text-xs bg-[#dfe8ce] rounded px-1 sm:px-2 py-0.5 sm:py-1 truncate cursor-pointer hover:bg-[#cfdcb5]"
                              >
                                {event.title}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-4 mt-4">
              <button
                className="bg-[#556B2F] hover:bg-[#6b8e23] text-white font-semibold px-6 py-3 rounded-lg shadow transition text-base flex-1"
                onClick={() => openForm()}
              >
                Add Event
              </button>
              <button
                className="bg-[#556B2F] hover:bg-[#6b8e23] text-white font-semibold px-6 py-3 rounded-lg shadow transition text-base flex-1"
                onClick={handleModifyEvent}
              >
                Modify Event
              </button>
            </div>
          </div>
        </div>

        {/* Event Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto flex flex-col max-h-[90vh]"
              onSubmit={handleSubmit}
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <input
                  className="flex-1 text-2xl font-medium text-[#2a2420] placeholder-gray-400 border-b-2 border-transparent focus:border-[#556B2F] outline-none pb-1"
                  placeholder="Add title"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 ml-3"
                  onClick={() => setShowForm(false)}
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="px-6 pb-4 flex flex-col gap-4 overflow-y-auto">
                {formError && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </p>
                )}

                {/* Date & time */}
                <div className="flex items-start gap-4">
                  <Clock size={20} className="text-gray-500 mt-1.5 shrink-0" />
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <input
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm text-[#2a2420] focus:outline-none focus:border-[#556B2F]"
                      type="date"
                      value={formData.date}
                      onChange={(e) => updateField("date", e.target.value)}
                      required
                    />
                    <input
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm text-[#2a2420] focus:outline-none focus:border-[#556B2F]"
                      type="time"
                      value={formData.time}
                      onChange={(e) => updateField("time", e.target.value)}
                      required
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm text-[#2a2420] focus:outline-none focus:border-[#556B2F]"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => updateField("endTime", e.target.value)}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-4 relative">
                  <MapPin size={20} className="text-gray-500 shrink-0" />
                  <div className="flex-1 relative">
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-[#2a2420] focus:outline-none focus:border-[#556B2F]"
                      placeholder="Add location"
                      value={formData.location}
                      onChange={(e) => updateField("location", e.target.value)}
                      onFocus={() => { if (locationSuggestions.length > 0) setShowLocationSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                      autoComplete="off"
                      required
                    />
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-56 overflow-y-auto">
                        {locationSuggestions.map((s, i) => {
                          const [primary, ...rest] = s.displayName.split(",");
                          const secondary = rest.join(",").trim();
                          return (
                            <li
                              key={`${s.placeId}-${i}`}
                              onMouseDown={() => handleSelectLocation(s.displayName)}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <div className="text-sm font-medium text-[#2a2420]">{primary}</div>
                              {secondary && <div className="text-xs text-gray-500">{secondary}</div>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Image: drag & drop / click to browse */}
                <div className="flex items-start gap-4">
                  <ImageIcon size={20} className="text-gray-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    {!displayImage ? (
                      <label
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleImageDrop}
                        className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg py-6 px-3 text-center cursor-pointer transition ${
                          isDragging ? "border-[#556B2F] bg-[#f0f5e8]" : "border-gray-300 hover:border-[#556B2F]"
                        }`}
                      >
                        <Upload size={20} className="text-gray-400" />
                        <span className="text-sm text-gray-500">Drag & drop an image, or click to browse</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFiles(e.target.files)}
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 w-full h-32">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={displayImage} alt="Event" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-1.5 right-1.5 bg-white/90 hover:bg-white rounded-full p-1 shadow"
                          aria-label="Remove image"
                        >
                          <X size={14} className="text-gray-700" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Uploads on save. Max 5MB.</p>
                  </div>
                </div>

                {/* Link */}
                <div className="flex items-center gap-4">
                  <Link2 size={20} className="text-gray-500 shrink-0" />
                  <input
                    className="flex-1 border-b border-gray-200 focus:border-[#556B2F] outline-none py-1.5 text-sm text-[#2a2420]"
                    type="url"
                    placeholder="Add link (optional)"
                    value={formData.link}
                    onChange={(e) => updateField("link", e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="flex items-start gap-4">
                  <AlignLeft size={20} className="text-gray-500 mt-1.5 shrink-0" />
                  <textarea
                    className="flex-1 border-b border-gray-200 focus:border-[#556B2F] outline-none py-1.5 text-sm text-[#2a2420] resize-none"
                    placeholder="Add description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
                {editingEvent && (
                  <button
                    type="button"
                    className="text-red-600 hover:bg-red-50 font-semibold px-3 py-2 rounded text-sm transition"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  className="text-[#556B2F] hover:bg-gray-100 font-semibold px-4 py-2 rounded text-sm transition"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#556B2F] hover:bg-[#6b8e23] text-white font-semibold px-5 py-2 rounded-full text-sm transition"
                >
                  {editingEvent ? "Save" : "Add"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800">
                Are you sure you want to delete &ldquo;{confirmModal.eventTitle}&rdquo;?
              </h3>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeConfirmModal}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedDelete}
                  className="rounded-md bg-red-700 hover:bg-red-800 px-3 py-2 text-sm font-semibold text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}