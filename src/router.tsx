import { createRouter, ErrorComponent } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    context: {
      session: null,
      user: null,
    },
    defaultErrorComponent: ({ error }) => (
      <ErrorComponent error={error} />
    ),
  });

  return router;
};
