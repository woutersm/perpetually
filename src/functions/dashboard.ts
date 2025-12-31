import { createServerFn } from "@tanstack/react-start";
import { loggingMiddleware } from "@/middleware/logging";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { license, activation, product, customer } from "@/lib/db/schema";
import { eq, and, desc, count, gte, sql } from "drizzle-orm";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getDashboardStats")])
  .handler(async ({ context: { organizationId } }) => {
    // Get total products and active count
    const products = await db
      .select({
        id: product.id,
        isActive: product.isActive,
      })
      .from(product)
      .where(eq(product.organizationId, organizationId));

    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive).length;

    // Get license stats
    const licenses = await db
      .select({
        id: license.id,
        status: license.status,
        createdAt: license.createdAt,
      })
      .from(license)
      .where(eq(license.organizationId, organizationId));

    const activeLicenses = licenses.filter((l) => l.status === "active").length;

    // Calculate license trend (last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentLicenseCount = licenses.filter(
      (l) => new Date(l.createdAt) >= thirtyDaysAgo
    ).length;
    const previousLicenseCount = licenses.filter(
      (l) =>
        new Date(l.createdAt) >= sixtyDaysAgo &&
        new Date(l.createdAt) < thirtyDaysAgo
    ).length;

    const licenseTrend =
      previousLicenseCount > 0
        ? Math.round(
            ((recentLicenseCount - previousLicenseCount) / previousLicenseCount) * 100
          )
        : recentLicenseCount > 0
          ? 100
          : 0;

    // Get total customers
    const [customerCount] = await db
      .select({ count: count() })
      .from(customer)
      .where(eq(customer.organizationId, organizationId));

    // Get total activations
    const [activationCount] = await db
      .select({ count: count() })
      .from(activation)
      .where(eq(activation.organizationId, organizationId));

    // Get recent licenses with product and customer info
    const recentLicenses = await db
      .select({
        id: license.id,
        key: license.key,
        status: license.status,
        expiresAt: license.expiresAt,
        createdAt: license.createdAt,
        product: {
          id: product.id,
          name: product.name,
        },
        customer: {
          id: customer.id,
          name: customer.name,
        },
      })
      .from(license)
      .leftJoin(product, eq(license.productId, product.id))
      .leftJoin(customer, eq(license.customerId, customer.id))
      .where(eq(license.organizationId, organizationId))
      .orderBy(desc(license.createdAt))
      .limit(5);

    // Get expiring licenses (within next 30 days)
    const expiringLicenses = await db
      .select({
        id: license.id,
        key: license.key,
        expiresAt: license.expiresAt,
      })
      .from(license)
      .where(
        and(
          eq(license.organizationId, organizationId),
          eq(license.status, "active"),
          gte(license.expiresAt, now),
          sql`${license.expiresAt} <= ${new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)}`
        )
      )
      .orderBy(license.expiresAt)
      .limit(5);

    return {
      totalProducts,
      activeProducts,
      activeLicenses,
      totalCustomers: customerCount?.count ?? 0,
      totalActivations: activationCount?.count ?? 0,
      licenseTrend,
      recentLicenses,
      expiringLicenses,
    };
  });
