import { createServerFn } from "@tanstack/react-start";
import { loggingMiddleware } from "@/middleware/logging";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { customer, license } from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

// Get all customers for the current organization
// Filtered by customers who have at least one license matching the test mode
export const getCustomers = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getCustomers")])
  .inputValidator((data: { isTestMode?: boolean }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const isTestMode = data?.isTestMode ?? false;

    // Get customer IDs that have licenses in the current mode
    const customerIdsWithLicenses = await db
      .selectDistinct({ customerId: license.customerId })
      .from(license)
      .where(
        and(
          eq(license.organizationId, organizationId),
          eq(license.isTest, isTestMode),
          sql`${license.customerId} IS NOT NULL`
        )
      );

    const customerIds = customerIdsWithLicenses
      .map((c) => c.customerId)
      .filter((id): id is string => id !== null);

    if (customerIds.length === 0) {
      return [];
    }

    const customers = await db
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.organizationId, organizationId),
          inArray(customer.id, customerIds)
        )
      )
      .orderBy(desc(customer.createdAt));

    return customers;
  });

// Get a single customer with licenses
export const getCustomer = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getCustomer")])
  .inputValidator((data: { customerId: string; isTestMode?: boolean }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const isTestMode = data?.isTestMode ?? false;

    const [customerData] = await db
      .select()
      .from(customer)
      .where(
        and(eq(customer.id, data.customerId), eq(customer.organizationId, organizationId))
      )
      .limit(1);

    if (!customerData) {
      throw new Error("Customer not found");
    }

    // Get licenses for this customer (filtered by test mode)
    const licenses = await db
      .select()
      .from(license)
      .where(
        and(
          eq(license.customerId, data.customerId),
          eq(license.isTest, isTestMode)
        )
      )
      .orderBy(desc(license.createdAt));

    return {
      ...customerData,
      licenses,
    };
  });

// Note: Customers are synced from Stripe, not created manually
// createCustomer, updateCustomer, and deleteCustomer were removed in Phase 2
