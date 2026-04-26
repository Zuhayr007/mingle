// Lightweight client-side message moderation for the chat data channel.
// Intentionally conservative — we block obvious abuse, contact-info leaks,
// and slurs. Server-side moderation should still be added for production.

const URL_RE =
  /\b((https?:\/\/|www\.)\S+|\S+\.(com|net|org|io|gg|co|me|tv|xyz|app|dev|info|biz)\b\S*)/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/;

// Keep the slur list short and obvious. Expand server-side later.
const BLOCKED_WORDS = [
  "nigger",
  "nigga",
  "faggot",
  "tranny",
  "retard",
  "kike",
  "chink",
  "spic",
  "cunt",
  "whore",
];

export type ModerationResult = { ok: true; clean: string } | { ok: false; reason: string };

export function moderateOutgoing(text: string): ModerationResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "Message is empty." };
  if (trimmed.length > 500) return { ok: false, reason: "Message is too long (max 500 chars)." };

  if (URL_RE.test(trimmed)) {
    return { ok: false, reason: "Links aren't allowed in chat." };
  }
  if (EMAIL_RE.test(trimmed)) {
    return { ok: false, reason: "Email addresses aren't allowed in chat." };
  }
  if (PHONE_RE.test(trimmed)) {
    return { ok: false, reason: "Phone numbers aren't allowed in chat." };
  }

  const lower = trimmed.toLowerCase().replace(/[^a-z\s]/g, " ");
  for (const word of BLOCKED_WORDS) {
    const re = new RegExp(`(^|\\s)${word}(\\s|$)`, "i");
    if (re.test(lower)) {
      return { ok: false, reason: "Please keep it respectful." };
    }
  }

  return { ok: true, clean: trimmed };
}
