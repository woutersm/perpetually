import { getSessionFn } from "@/functions/sessions";
import { createMiddleware } from "@tanstack/react-start";

const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await getSessionFn();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    if (!session.currentOrganization) {
      throw new Error("No organization - complete onboarding first");
    }

    return next({
      context: {
        session,
        user: session.user,
        userId: session.user.id,
        organization: session.currentOrganization,
        organizationId: session.currentOrganization.id,
      },
    });
  }
);

export default authMiddleware;
