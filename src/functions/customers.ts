import { createServerFn } from "@tanstack/react-start";
import { wideEventMiddleware } from "@/middleware/wide-event";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { customer, license } from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

// Get all customers for the current organization
// Filtered by customers who have at least one license matching the test mode
export const getCustomers = createServerFn({ method: "GET" })
  .middleware([authMiddleware, wideEventMiddleware("customer.list")])
  .inputValidator((data: { isTestMode?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { organizationId, event } = context;
    const isTestMode = data?.isTestMode ?? false;

    event.set("filter.is_test", isTestMode);

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
      event.set("result.count", 0);
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

    event.set("result.count", customers.length);

    return customers;
  });

// Get a single customer with licenses
export const getCustomer = createServerFn({ method: "GET" })
  .middleware([authMiddleware, wideEventMiddleware("customer.get")])
  .inputValidator((data: { customerId: string; isTestMode?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { organizationId, event } = context;
    const isTestMode = data?.isTestMode ?? false;

    event.set("customer.id", data.customerId);
    event.set("filter.is_test", isTestMode);

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

    event.set("customer.email", customerData.email);
    event.set("licenses.count", licenses.length);

    return {
      ...customerData,
      licenses,
    };
  });

// Note: Customers are synced from Stripe, not created manually
// createCustomer, updateCustomer, and deleteCustomer were removed in Phase 2
