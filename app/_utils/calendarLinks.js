// Build "Add to Calendar" links/files for an event.
// event: { title, description, location, start: Date, end: Date }

const DEFAULT_DURATION_MS = 60 * 60 * 1000; // 1 hour, used when no end time is set

function resolveEnd(event) {
  if (event.end && !isNaN(event.end)) return event.end;
  return new Date(event.start.getTime() + DEFAULT_DURATION_MS);
}

function toUtcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildGoogleCalendarUrl(event) {
  const end = resolveEnd(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "",
    dates: `${toUtcStamp(event.start)}/${toUtcStamp(end)}`,
    details: event.description || "",
    location: event.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(event) {
  const end = resolveEnd(event);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title || "",
    startdt: event.start.toISOString(),
    enddt: end.toISOString(),
    location: event.location || "",
    body: event.description || "",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function buildIcsContent(event) {
  const end = resolveEnd(event);
  const escape = (str = "") => str.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PASOC//Events//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@pasoc`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(event.start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(event) {
  const blob = new Blob([buildIcsContent(event)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(event.title || "event").replace(/[^\w-]+/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
