import { schedules } from "@trigger.dev/sdk";
import { and, eq, gt, lt, lte, isNull, isNotNull } from "drizzle-orm";
import db from "@/lib/db/db";
import { license, product, customer, organization } from "@/lib/db/schema";
import {
  sendLicenseExpiringSoonEmail,
  sendLicenseExpiredEmail,
  isEmailConfigured,
} from "@/lib/email/notifications";

// Check for expiring licenses and send notifications
// Runs daily at 9:00 AM UTC
export const licenseExpiryNotifications = schedules.task({
  id: "license-expiry-notifications",
  cron: {
    pattern: "0 9 * * *", // 9 AM UTC daily
    timezone: "UTC",
  },
  run: async (payload) => {
    console.log("Running license expiry notifications check at:", payload.timestamp);

    if (!isEmailConfigured()) {
      console.log("Email not configured, skipping notifications");
      return { skipped: true, reason: "Email not configured" };
    }

    const now = new Date();

    const results = {
      sevenDayNotifications: 0,
      oneDayNotifications: 0,
      expiredNotifications: 0,
      errors: [] as string[],
    };

    // 1. Find licenses expiring in ~7 days (between 6 and 8 days from now)
    // that haven't been notified yet
    const sixDaysFromNow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
    const eightDaysFromNow = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

    const licensesExpiring7Days = await db
      .select({
        id: license.id,
        key: license.key,
        expiresAt: license.expiresAt,
        customerEmail: customer.email,
        customerName: customer.name,
        productName: product.name,
        orgName: organization.name,
      })
      .from(license)
      .innerJoin(customer, eq(license.customerId, customer.id))
      .innerJoin(product, eq(license.productId, product.id))
      .innerJoin(organization, eq(license.organizationId, organization.id))
      .where(
        and(
          eq(license.status, "active"),
          isNotNull(license.expiresAt),
          gt(license.expiresAt, sixDaysFromNow),
          lt(license.expiresAt, eightDaysFromNow),
          isNull(license.expiryNotified7DaysAt)
        )
      );

    for (const lic of licensesExpiring7Days) {
      try {
        const daysRemaining = Math.ceil(
          (lic.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        await sendLicenseExpiringSoonEmail({
          customerEmail: lic.customerEmail,
          customerName: lic.customerName ?? lic.customerEmail,
          licenseKey: lic.key,
          productName: lic.productName,
          daysRemaining,
          expiresAt: lic.expiresAt!,
          orgName: lic.orgName,
        });

        // Mark as notified
        await db
          .update(license)
          .set({ expiryNotified7DaysAt: now })
          .where(eq(license.id, lic.id));

        results.sevenDayNotifications++;
        console.log("Sent 7-day expiry notification for license:", lic.key);
      } catch (error) {
        const errorMsg = `Failed to send 7-day notification for ${lic.key}: ${error}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    // 2. Find licenses expiring in ~1 day (between 0 and 2 days from now)
    // that haven't been notified yet
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const licensesExpiring1Day = await db
      .select({
        id: license.id,
        key: license.key,
        expiresAt: license.expiresAt,
        customerEmail: customer.email,
        customerName: customer.name,
        productName: product.name,
        orgName: organization.name,
      })
      .from(license)
      .innerJoin(customer, eq(license.customerId, customer.id))
      .innerJoin(product, eq(license.productId, product.id))
      .innerJoin(organization, eq(license.organizationId, organization.id))
      .where(
        and(
          eq(license.status, "active"),
          isNotNull(license.expiresAt),
          gt(license.expiresAt, now),
          lt(license.expiresAt, twoDaysFromNow),
          isNull(license.expiryNotified1DayAt)
        )
      );

    for (const lic of licensesExpiring1Day) {
      try {
        const daysRemaining = Math.ceil(
          (lic.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        await sendLicenseExpiringSoonEmail({
          customerEmail: lic.customerEmail,
          customerName: lic.customerName ?? lic.customerEmail,
          licenseKey: lic.key,
          productName: lic.productName,
          daysRemaining,
          expiresAt: lic.expiresAt!,
          orgName: lic.orgName,
        });

        // Mark as notified
        await db
          .update(license)
          .set({ expiryNotified1DayAt: now })
          .where(eq(license.id, lic.id));

        results.oneDayNotifications++;
        console.log("Sent 1-day expiry notification for license:", lic.key);
      } catch (error) {
        const errorMsg = `Failed to send 1-day notification for ${lic.key}: ${error}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    // 3. Find licenses that have expired (expiresAt < now) that haven't been notified
    const licensesExpired = await db
      .select({
        id: license.id,
        key: license.key,
        expiresAt: license.expiresAt,
        customerEmail: customer.email,
        customerName: customer.name,
        productName: product.name,
        orgName: organization.name,
      })
      .from(license)
      .innerJoin(customer, eq(license.customerId, customer.id))
      .innerJoin(product, eq(license.productId, product.id))
      .innerJoin(organization, eq(license.organizationId, organization.id))
      .where(
        and(
          eq(license.status, "active"),
          isNotNull(license.expiresAt),
          lte(license.expiresAt, now),
          isNull(license.expiryNotifiedExpiredAt)
        )
      );

    for (const lic of licensesExpired) {
      try {
        await sendLicenseExpiredEmail({
          customerEmail: lic.customerEmail,
          customerName: lic.customerName ?? lic.customerEmail,
          licenseKey: lic.key,
          productName: lic.productName,
          expiredAt: lic.expiresAt!,
          orgName: lic.orgName,
        });

        // Mark as notified
        await db
          .update(license)
          .set({ expiryNotifiedExpiredAt: now })
          .where(eq(license.id, lic.id));

        results.expiredNotifications++;
        console.log("Sent expired notification for license:", lic.key);
      } catch (error) {
        const errorMsg = `Failed to send expired notification for ${lic.key}: ${error}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log("License expiry notifications completed:", results);
    return results;
  },
});
