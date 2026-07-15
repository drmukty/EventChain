/**
 * Simple email helper using Resend (https://resend.com). This file intentionally
 * keeps dependencies minimal and uses the Resend REST API via fetch so no
 * additional SDK packages are required.
 *
 * Environment variables:
 * - RESEND_API_KEY    (optional — if not present, emails are skipped)
 * - EMAIL_FROM        (required when RESEND_API_KEY is present; e.g. "EventChain <no-reply@eventchain.dev>")
 */

type SendApprovalEmailInput = {
  to: string;
  name: string;
  eventTitle: string;
  eventStartsAt: Date;
  eventVenue: string;
  qrDataUrl: string; // data:image/png;base64,...
};

export async function sendApprovalEmail(input: SendApprovalEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    console.error("sendApprovalEmail: RESEND_API_KEY not configured — skipping email");
    return;
  }
  if (!from) {
    console.error("sendApprovalEmail: EMAIL_FROM not configured — skipping email");
    return;
  }

  const subject = "Application Approved – EventChain";

  const startsAt = new Date(input.eventStartsAt).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  // Extract base64 payload from data URL
  const matches = input.qrDataUrl.match(/^data:(image\/png);base64,(.+)$/);
  let base64Data = "";
  if (matches) {
    base64Data = matches[2];
  } else {
    // If it's not a data URL, assume caller passed raw base64 (unlikely)
    base64Data = input.qrDataUrl;
  }

  const cid = "qr-eventchain"; // Content-ID to reference the attachment inline

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color: #111;">
      <h2>Congratulations${input.name ? `, ${escapeHtml(input.name)}` : ""}!</h2>
      <p>Your application has been approved for <strong>${escapeHtml(input.eventTitle)}</strong>.</p>
      <p>
        <strong>Event date:</strong> ${escapeHtml(startsAt)}<br/>
        <strong>Venue:</strong> ${escapeHtml(input.eventVenue)}
      </p>
      <p>This is your approval confirmation. The QR code attached to this email will be scanned at the event entrance — please show this on arrival.</p>
      <div style="margin-top: 18px;">
        <img src="cid:${cid}" alt="Your event QR code" style="max-width:320px;border:1px solid #eee;border-radius:8px;" />
      </div>
      <p style="color:#666;margin-top:12px;font-size:13px;">If you have any questions, reply to this email.</p>
    </div>
  `;

  try {
    // Resend supports attachments in the JSON body. We pass the PNG as base64
    // and include a content_id so mail clients that support CID embedding
    // (Gmail, Outlook, Apple Mail) can show the image inline.
    const body: any = {
      from,
      to: input.to,
      subject,
      html,
      attachments: [
        {
          type: "image/png",
          filename: "qr.png",
          // Resend expects base64-encoded data in a `data` or `data_base64` field
          // The API has varied; include `data` here which Resend accepts as base64.
          // Also include a `content_id` field for CID embedding.
          data: base64Data,
          content_id: cid,
        },
      ],
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("sendApprovalEmail: resend responded with non-OK status", res.status, text);
    }
  } catch (err) {
    console.error("sendApprovalEmail: failed to call resend API", err);
  }
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
