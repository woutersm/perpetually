import { Resend } from "resend";

// Initialize Resend client - will be undefined if no API key is set
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Default from address - can be customized per organization later
const DEFAULT_FROM = "Perpetually <noreply@perpetually.dev>";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  from = DEFAULT_FROM,
  replyTo,
}: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping email:", subject);
    return { success: false, error: "Email not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo,
    });

    if (error) {
      console.error("[Email] Failed to send:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Sent successfully:", subject, "to", to);
    return { success: true };
  } catch (err) {
    console.error("[Email] Error sending email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Check if email is configured
export function isEmailConfigured(): boolean {
  return !!resend;
}
