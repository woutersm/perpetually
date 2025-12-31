import { createServerFn } from "@tanstack/react-start";
import { loggingMiddleware } from "@/middleware/logging";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { customer, license } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Get all customers for the current organization
export const getCustomers = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getCustomers")])
  .handler(async ({ context: { organizationId } }) => {
    const customers = await db
      .select()
      .from(customer)
      .where(eq(customer.organizationId, organizationId))
      .orderBy(desc(customer.createdAt));

    return customers;
  });

// Get a single customer with licenses
export const getCustomer = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getCustomer")])
  .inputValidator((data: { customerId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
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

    // Get licenses for this customer
    const licenses = await db
      .select()
      .from(license)
      .where(eq(license.customerId, data.customerId))
      .orderBy(desc(license.createdAt));

    return {
      ...customerData,
      licenses,
    };
  });

// Note: Customers are synced from Stripe, not created manually
// createCustomer, updateCustomer, and deleteCustomer were removed in Phase 2
