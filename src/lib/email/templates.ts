// Email templates for Perpetually notifications
// All templates return HTML strings

type BaseTemplateParams = {
  orgName: string;
  orgLogo?: string;
};

function baseLayout(content: string, params: BaseTemplateParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Perpetually</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #e5e5e5;">
              <span style="font-size: 20px; font-weight: 600; color: #171717;">${params.orgName}</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 12px; color: #737373; text-align: center;">
                Powered by <a href="https://perpetually.dev" style="color: #6366f1; text-decoration: none;">Perpetually</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// License Created Email - sent to customer
export type LicenseCreatedParams = BaseTemplateParams & {
  customerName: string;
  productName: string;
  licenseKey: string;
  expiresAt: Date | null;
  activationLimit: number | null;
  portalUrl?: string;
};

export function licenseCreatedTemplate(params: LicenseCreatedParams): string {
  const expirationText = params.expiresAt
    ? `Expires: ${params.expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
    : "Never expires";

  const activationText = params.activationLimit
    ? `${params.activationLimit} device${params.activationLimit === 1 ? "" : "s"}`
    : "Unlimited devices";

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #171717;">
      Your License Key
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6;">
      Hi ${params.customerName},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6;">
      Thank you for purchasing <strong>${params.productName}</strong>. Your license key is ready to use:
    </p>

    <!-- License Key Box -->
    <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 0 0 24px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">
        License Key
      </p>
      <p style="margin: 0; font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 18px; font-weight: 600; color: #171717; letter-spacing: 1px;">
        ${params.licenseKey}
      </p>
    </div>

    <!-- License Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 8px 8px 0 0; border-bottom: 1px solid #e5e5e5;">
          <span style="font-size: 14px; color: #737373;">Product</span>
          <span style="float: right; font-size: 14px; color: #171717; font-weight: 500;">${params.productName}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-bottom: 1px solid #e5e5e5;">
          <span style="font-size: 14px; color: #737373;">Expiration</span>
          <span style="float: right; font-size: 14px; color: #171717; font-weight: 500;">${expirationText}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 0 0 8px 8px;">
          <span style="font-size: 14px; color: #737373;">Activations</span>
          <span style="float: right; font-size: 14px; color: #171717; font-weight: 500;">${activationText}</span>
        </td>
      </tr>
    </table>

    ${params.portalUrl ? `
    <p style="margin: 0 0 24px 0; text-align: center;">
      <a href="${params.portalUrl}" style="display: inline-block; padding: 12px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 8px;">
        Manage Your License
      </a>
    </p>
    ` : ""}

    <p style="margin: 0; font-size: 14px; color: #737373; line-height: 1.6;">
      If you have any questions, please contact our support team.
    </p>
  `;

  return baseLayout(content, params);
}

// License Expiring Soon Email - sent to customer
export type LicenseExpiringSoonParams = BaseTemplateParams & {
  customerName: string;
  productName: string;
  licenseKey: string;
  expiresAt: Date;
  daysRemaining: number;
  portalUrl?: string;
};

export function licenseExpiringSoonTemplate(params: LicenseExpiringSoonParams): string {
  const dayText = params.daysRemaining === 1 ? "1 day" : `${params.daysRemaining} days`;

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #171717;">
      License Expiring Soon
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6;">
      Hi ${params.customerName},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6;">
      Your license for <strong>${params.productName}</strong> will expire in <strong>${dayText}</strong>.
    </p>

    <!-- Warning Box -->
    <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Expires:</strong> ${params.expiresAt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>

    <!-- License Key -->
    <div style="background-color: #f5f5f5; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #737373;">License Key</p>
      <p style="margin: 0; font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 14px; color: #171717;">
        ${params.licenseKey}
      </p>
    </div>

    ${params.portalUrl ? `
    <p style="margin: 0 0 24px 0; text-align: center;">
      <a href="${params.portalUrl}" style="display: inline-block; padding: 12px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 8px;">
        Renew Your License
      </a>
    </p>
    ` : ""}

    <p style="margin: 0; font-size: 14px; color: #737373; line-height: 1.6;">
      To continue using ${params.productName} without interruption, please renew your license before it expires.
    </p>
  `;

  return baseLayout(content, params);
}

// License Expired Email - sent to customer
export type LicenseExpiredParams = BaseTemplateParams & {
  customerName: string;
  productName: string;
  licenseKey: string;
  expiredAt: Date;
  portalUrl?: string;
};

export function licenseExpiredTemplate(params: LicenseExpiredParams): string {
  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #171717;">
      License Expired
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6;">
      Hi ${params.customerName},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6;">
      Your license for <strong>${params.productName}</strong> has expired.
    </p>

    <!-- Expired Box -->
    <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #991b1b;">
        <strong>Expired:</strong> ${params.expiredAt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>

    <!-- License Key -->
    <div style="background-color: #f5f5f5; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #737373;">License Key</p>
      <p style="margin: 0; font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 14px; color: #171717;">
        ${params.licenseKey}
      </p>
    </div>

    ${params.portalUrl ? `
    <p style="margin: 0 0 24px 0; text-align: center;">
      <a href="${params.portalUrl}" style="display: inline-block; padding: 12px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 8px;">
        Renew Your License
      </a>
    </p>
    ` : ""}

    <p style="margin: 0; font-size: 14px; color: #737373; line-height: 1.6;">
      To regain access to ${params.productName}, please renew your license.
    </p>
  `;

  return baseLayout(content, params);
}

// Refund Detected Email - sent to org owner
export type RefundDetectedParams = BaseTemplateParams & {
  customerName: string;
  customerEmail: string;
  productName: string;
  licenseKey: string;
  refundAmount: string;
  licenseId: string;
  dashboardUrl?: string;
};

export function refundDetectedTemplate(params: RefundDetectedParams): string {
  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #171717;">
      Refund Detected
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6;">
      A refund has been processed for one of your licenses. The license has <strong>not</strong> been automatically disabled.
    </p>

    <!-- Alert Box -->
    <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Action Required:</strong> Review this refund and decide whether to disable the license.
      </p>
    </div>

    <!-- Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 8px 8px 0 0; border-bottom: 1px solid #e5e5e5;">
          <span style="font-size: 14px; color: #737373;">Customer</span>
          <span style="float: right; font-size: 14px; color: #171717; font-weight: 500;">${params.customerName}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-bottom: 1px solid #e5e5e5;">
          <span style="font-size: 14px; color: #737373;">Email</span>
          <span style="float: right; font-size: 14px; color: #171717; font-weight: 500;">${params.customerEmail}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-bottom: 1px solid #e5e5e5;">
          <span style="font-size: 14px; color: #737373;">Product</span>
          <span style="float: right; font-size: 14px; color: #171717; font-weight: 500;">${params.productName}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-bottom: 1px solid #e5e5e5;">
          <span style="font-size: 14px; color: #737373;">License Key</span>
          <span style="float: right; font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 14px; color: #171717; font-weight: 500;">${params.licenseKey}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 0 0 8px 8px;">
          <span style="font-size: 14px; color: #737373;">Refund Amount</span>
          <span style="float: right; font-size: 14px; color: #dc2626; font-weight: 500;">${params.refundAmount}</span>
        </td>
      </tr>
    </table>

    ${params.dashboardUrl ? `
    <p style="margin: 0 0 24px 0; text-align: center;">
      <a href="${params.dashboardUrl}" style="display: inline-block; padding: 12px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 8px;">
        Review License
      </a>
    </p>
    ` : ""}

    <p style="margin: 0; font-size: 14px; color: #737373; line-height: 1.6;">
      You can disable this license from your dashboard if appropriate.
    </p>
  `;

  return baseLayout(content, params);
}

// New Activation Email - sent to customer (optional)
export type NewActivationParams = BaseTemplateParams & {
  customerName: string;
  productName: string;
  licenseKey: string;
  deviceName?: string;
  activationCount: number;
  activationLimit: number | null;
  portalUrl?: string;
};

export function newActivationTemplate(params: NewActivationParams): string {
  const limitText = params.activationLimit
    ? `${params.activationCount} of ${params.activationLimit}`
    : `${params.activationCount} (unlimited)`;

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #171717;">
      New Device Activated
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6;">
      Hi ${params.customerName},
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6;">
      A new device has been activated for your <strong>${params.productName}</strong> license.
    </p>

    <!-- Activation Info -->
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534;">
        <strong>Device:</strong> ${params.deviceName || "Unknown device"}
      </p>
      <p style="margin: 0; font-size: 14px; color: #166534;">
        <strong>Activations used:</strong> ${limitText}
      </p>
    </div>

    <!-- License Key -->
    <div style="background-color: #f5f5f5; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #737373;">License Key</p>
      <p style="margin: 0; font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 14px; color: #171717;">
        ${params.licenseKey}
      </p>
    </div>

    ${params.portalUrl ? `
    <p style="margin: 0 0 24px 0; text-align: center;">
      <a href="${params.portalUrl}" style="display: inline-block; padding: 12px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 8px;">
        Manage Activations
      </a>
    </p>
    ` : ""}

    <p style="margin: 0; font-size: 14px; color: #737373; line-height: 1.6;">
      If you didn't authorize this activation, please review your devices immediately.
    </p>
  `;

  return baseLayout(content, params);
}
