/**
 * Simple email helper using Resend (https://resend.com).
 * Falls back to console log if no API key.
 */

type SendApprovalEmailInput = {
  to: string;
  name: string;
  eventTitle: string;
  eventStartsAt: Date;
  eventVenue: string;
  qrDataUrl: string;
};

export async function sendApprovalEmail(input: SendApprovalEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.error("sendApprovalEmail: missing config – skipping");
    return;
  }

  const startsAt = new Date(input.eventStartsAt).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  const matches = input.qrDataUrl.match(/^data:(image\/png);base64,(.+)$/);
  const base64Data = matches ? matches[2] : input.qrDataUrl;
  const cid = "qr-eventchain";

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px;">
      <h2 style="color: #1a1a2e;">Congratulations${input.name ? `, ${escapeHtml(input.name)}` : ""}!</h2>
      <p>Your application has been approved for <strong>${escapeHtml(input.eventTitle)}</strong>.</p>
      <p><strong>Event date:</strong> ${escapeHtml(startsAt)}<br/><strong>Venue:</strong> ${escapeHtml(input.eventVenue)}</p>
      <p>This is your approval confirmation. The QR code attached to this email will be scanned at the event entrance.</p>
      <div style="margin-top: 18px;"><img src="cid:${cid}" alt="QR code" style="max-width:320px;border:1px solid #eee;border-radius:8px;" /></div>
      <p style="color:#666;font-size:13px;">If you have any questions, reply to this email.</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: "Application Approved – EventChain",
        html,
        attachments: [{ type: "image/png", filename: "qr.png", data: base64Data, content_id: cid }],
      }),
    });
    if (!res.ok) console.error("Resend error:", await res.text());
  } catch (err) {
    console.error("sendApprovalEmail failed:", err);
  }
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// ---------- Password reset email ----------

export async function sendPasswordResetEmail(to: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eventschain.vercel.app";
  const resetLink = `${baseUrl}/auth/reset-password/${token}`;

  if (!apiKey) {
    console.log(`🔐 RESET LINK (no email): ${resetLink}`);
    console.log(`📧 Would send to: ${to}`);
    return;
  }

  if (!from) {
    console.error("sendPasswordResetEmail: EMAIL_FROM missing");
    return;
  }

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px;">
      <h2 style="color: #1a1a2e;">Reset your password</h2>
      <p>We received a request to reset your EventChain password.</p>
      <a href="${resetLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Reset password</a>
      <p style="color: #6b6b8a; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      <p style="color: #6b6b8a; font-size: 12px; margin-top: 20px; border-top: 1px solid #eaeaea; padding-top: 16px;">This link expires in 1 hour.</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to, subject: "Reset your EventChain password", html }),
    });
    if (!res.ok) console.error("Resend error:", await res.text());
  } catch (err) {
    console.error("sendPasswordResetEmail failed:", err);
  }
}
