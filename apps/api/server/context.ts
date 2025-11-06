import { AsyncLocalStorage } from "async_hooks";
import { Request } from "express";

/**
 * Async local storage for request context
 * Allows access to the request object throughout the application without passing it explicitly
 */
export const requestContext = new AsyncLocalStorage<Request>();

/**
 * Get the current request from context
 * @returns The current Express request object or undefined if not in request context
 */
export function getRequest(): Request | undefined {
  return requestContext.getStore();
}
