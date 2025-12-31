// Email notification functions for Perpetually
// These wrap templates with sendEmail for easy use

import { sendEmail, isEmailConfigured } from "../email";
import {
  licenseCreatedTemplate,
  licenseExpiringSoonTemplate,
  licenseExpiredTemplate,
  refundDetectedTemplate,
  newActivationTemplate,
  type LicenseCreatedParams,
  type LicenseExpiringSoonParams,
  type LicenseExpiredParams,
  type RefundDetectedParams,
  type NewActivationParams,
} from "./templates";

// Re-export for convenience
export { isEmailConfigured };

// Send license created notification to customer
export async function sendLicenseCreatedEmail(
  params: LicenseCreatedParams & { customerEmail: string }
) {
  const html = licenseCreatedTemplate(params);
  return sendEmail({
    to: params.customerEmail,
    subject: `Your ${params.productName} License Key`,
    html,
  });
}

// Send license expiring soon notification to customer
export async function sendLicenseExpiringSoonEmail(
  params: LicenseExpiringSoonParams & { customerEmail: string }
) {
  const html = licenseExpiringSoonTemplate(params);
  const dayText = params.daysRemaining === 1 ? "tomorrow" : `in ${params.daysRemaining} days`;
  return sendEmail({
    to: params.customerEmail,
    subject: `Your ${params.productName} license expires ${dayText}`,
    html,
  });
}

// Send license expired notification to customer
export async function sendLicenseExpiredEmail(
  params: LicenseExpiredParams & { customerEmail: string }
) {
  const html = licenseExpiredTemplate(params);
  return sendEmail({
    to: params.customerEmail,
    subject: `Your ${params.productName} license has expired`,
    html,
  });
}

// Send refund detected notification to org owner
export async function sendRefundDetectedEmail(
  params: RefundDetectedParams & { ownerEmail: string }
) {
  const html = refundDetectedTemplate(params);
  return sendEmail({
    to: params.ownerEmail,
    subject: `Refund detected for ${params.productName} license`,
    html,
  });
}

// Send new activation notification to customer (optional)
export async function sendNewActivationEmail(
  params: NewActivationParams & { customerEmail: string }
) {
  const html = newActivationTemplate(params);
  return sendEmail({
    to: params.customerEmail,
    subject: `New device activated for ${params.productName}`,
    html,
  });
}
