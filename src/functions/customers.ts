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

// Create a new customer
export const createCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("createCustomer")])
  .inputValidator(
    (data: {
      name: string;
      email: string;
      company?: string;
    }) => data
  )
  .handler(async ({ data, context: { organizationId } }) => {
    // Check if email is already taken in this org
    const existing = await db
      .select()
      .from(customer)
      .where(
        and(eq(customer.email, data.email), eq(customer.organizationId, organizationId))
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Customer with this email already exists");
    }

    const [newCustomer] = await db
      .insert(customer)
      .values({
        name: data.name,
        email: data.email,
        company: data.company,
        organizationId,
      })
      .returning();

    return newCustomer;
  });

// Update a customer
export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("updateCustomer")])
  .inputValidator(
    (data: {
      customerId: string;
      name?: string;
      email?: string;
      company?: string;
    }) => data
  )
  .handler(async ({ data, context: { organizationId } }) => {
    const { customerId, ...updates } = data;

    // If updating email, check for duplicates
    if (updates.email) {
      const existing = await db
        .select()
        .from(customer)
        .where(
          and(
            eq(customer.email, updates.email),
            eq(customer.organizationId, organizationId)
          )
        )
        .limit(1);

      if (existing.length > 0 && existing[0].id !== customerId) {
        throw new Error("Customer with this email already exists");
      }
    }

    const [updated] = await db
      .update(customer)
      .set(updates)
      .where(
        and(eq(customer.id, customerId), eq(customer.organizationId, organizationId))
      )
      .returning();

    if (!updated) {
      throw new Error("Customer not found");
    }

    return updated;
  });

// Delete a customer
export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("deleteCustomer")])
  .inputValidator((data: { customerId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    // Check if customer has any licenses
    const licenses = await db
      .select()
      .from(license)
      .where(eq(license.customerId, data.customerId))
      .limit(1);

    if (licenses.length > 0) {
      throw new Error("Cannot delete customer with existing licenses");
    }

    const [deleted] = await db
      .delete(customer)
      .where(
        and(eq(customer.id, data.customerId), eq(customer.organizationId, organizationId))
      )
      .returning();

    if (!deleted) {
      throw new Error("Customer not found");
    }

    return { success: true };
  });
