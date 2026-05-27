import "server-only";

/**
 * Dev-only email logger.
 *
 * Real Resend integration lands in Phase 12. Until then, we surface what
 * *would* be sent so admins can copy invite links from the modal — and
 * developers can grab them out of the server log.
 */

interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export function logEmail(message: EmailMessage): void {
  if (process.env.NODE_ENV === "production") {
    // In production we don't want noisy console emails. Once Resend is
    // wired, this branch will call resend.emails.send(...).
    return;
  }
  // Bracketed prefix so it's easy to grep dev logs.
  console.log(
    [
      "",
      "─── [email · dev] ──────────────────────────────────────────",
      `  to:      ${message.to}`,
      `  subject: ${message.subject}`,
      "  body:",
      message.body
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n"),
      "─────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}
