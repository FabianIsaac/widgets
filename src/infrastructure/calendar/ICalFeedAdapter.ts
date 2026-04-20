import { requestUrl } from "obsidian";
import { ICalendarPort } from "@domain/calendar/ports/ICalendarPort";
import { CalendarEvent } from "@domain/calendar/value-objects/CalendarEvent";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedEvent {
  summary: string;
  /** Parsed start as local-time Date (all-day events at midnight local). */
  start: Date;
  /** Parsed end as local-time Date, or null. */
  end: Date | null;
  allDay: boolean;
}

interface CacheEntry {
  events: ParsedEvent[];
  fetchedAt: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory cache

/**
 * Parses an iCal property line into its name, params, and value.
 * Handles folded lines (leading whitespace = continuation) before calling this.
 */
function parseProp(line: string): { name: string; params: string; value: string } {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return { name: line, params: "", value: "" };
  const nameAndParams = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const scIdx = nameAndParams.indexOf(";");
  if (scIdx === -1) return { name: nameAndParams, params: "", value };
  return {
    name: nameAndParams.slice(0, scIdx),
    params: nameAndParams.slice(scIdx + 1),
    value,
  };
}

/**
 * Parses an iCal date/datetime string into a local-time Date.
 * Supported formats:
 *   - YYYYMMDD           (all-day → midnight local)
 *   - YYYYMMDDTHHmmss    (local/floating, or TZID-qualified — treated as local)
 *   - YYYYMMDDTHHmmssZ   (UTC → converted to local via Date.UTC)
 *
 * TZID events are treated as local machine time, which is correct when the
 * machine timezone matches the calendar timezone.
 */
function parseICalDatetime(value: string): { date: Date; allDay: boolean } {
  const allDay = value.length === 8; // YYYYMMDD only
  const y  = parseInt(value.slice(0, 4), 10);
  const mo = parseInt(value.slice(4, 6), 10) - 1;
  const d  = parseInt(value.slice(6, 8), 10);

  if (allDay) return { date: new Date(y, mo, d, 0, 0, 0), allDay: true };

  const h   = parseInt(value.slice(9, 11), 10);
  const mi  = parseInt(value.slice(11, 13), 10);
  const isUtc = value.endsWith("Z");

  const date = isUtc
    ? new Date(Date.UTC(y, mo, d, h, mi, 0))
    : new Date(y, mo, d, h, mi, 0);

  return { date, allDay: false };
}

/** Returns "HH:mm" from a Date in local time. */
function toHHmm(date: Date): string {
  return (
    String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0")
  );
}

/** Returns YYYY-MM-DD in local time for a Date. */
function toLocalDateStr(date: Date): string {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

/**
 * Minimal iCal (RFC 5545) parser. Extracts VEVENTs only.
 * Handles folded lines, basic DTSTART/DTEND/SUMMARY properties.
 * Recurrence rules (RRULE) are intentionally not expanded.
 */
function parseIcal(text: string): ParsedEvent[] {
  // Unfold continuation lines (RFC 5545 §3.1)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedEvent[] = [];
  let inEvent = false;
  let summary = "";
  let dtstart: { date: Date; allDay: boolean } | null = null;
  let dtend: Date | null = null;

  for (const raw of lines) {
    const line = raw.trim();

    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      summary = "";
      dtstart = null;
      dtend = null;
      continue;
    }

    if (line === "END:VEVENT") {
      if (inEvent && dtstart && summary) {
        events.push({ summary, start: dtstart.date, end: dtend, allDay: dtstart.allDay });
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    const { name, params, value } = parseProp(line);

    switch (name) {
      case "SUMMARY":
        summary = value
          .replace(/\\n/gi, " ")
          .replace(/\\,/g, ",")
          .replace(/\\;/g, ";")
          .replace(/\\\\/g, "\\");
        break;

      case "DTSTART": {
        const allDayByParam = params.includes("VALUE=DATE");
        const parsed = parseICalDatetime(value);
        dtstart = allDayByParam ? { date: parsed.date, allDay: true } : parsed;
        break;
      }

      case "DTEND":
        dtend = parseICalDatetime(value).date;
        break;
    }
  }

  return events;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

/**
 * Infrastructure adapter: fetches an iCal feed via Obsidian's requestUrl
 * (bypasses CSP/CORS restrictions) and returns events for a given local date.
 * Parsed events are cached in memory for CACHE_TTL_MS per URL to avoid
 * redundant fetches within the same Obsidian session.
 */
export class ICalFeedAdapter implements ICalendarPort {
  private readonly cache = new Map<string, CacheEntry>();

  async fetchEventsForDate(url: string, dateStr: string): Promise<CalendarEvent[]> {
    const allEvents = await this.getAllEvents(url);
    return allEvents
      .filter((e) => toLocalDateStr(e.start) === dateStr)
      .sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return a.start.getTime() - b.start.getTime();
      })
      .map((e): CalendarEvent => ({
        summary: e.summary,
        allDay: e.allDay,
        startTime: e.allDay ? undefined : toHHmm(e.start),
        endTime: e.end && !e.allDay ? toHHmm(e.end) : undefined,
      }));
  }

  private async getAllEvents(url: string): Promise<ParsedEvent[]> {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.events;
    }

    // Use Obsidian's requestUrl to bypass Content Security Policy
    const response = await requestUrl(url);
    const events = parseIcal(response.text);

    this.cache.set(url, { events, fetchedAt: Date.now() });
    return events;
  }
}
