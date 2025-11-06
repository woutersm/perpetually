import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  route("api/stripe/connect", "./routes/api.stripe.connect.tsx"),

  route("hooks/:teamId", "./routes/hooks.$teamId.ts"),

  route("register", "./routes/register.tsx"),
  route("logout", "./routes/logout.tsx"),
  route("login", "./routes/login.tsx"),

  ...prefix("/portal", [
    layout("./routes/portal/layout.tsx", [
      route(":slug/:customerId", "./routes/portal/index.tsx"),
    ]),
  ]),

  layout("./routes/auth/layout.tsx", [
    index("./routes/auth/index.tsx"),

    ...prefix("/onboarding", [
      route("1", "./routes/auth/onboarding/1.tsx"),
      route("import", "./routes/auth/onboarding/import.tsx"),
      route("2", "./routes/auth/onboarding/2.tsx"),
    ]),

    ...prefix("/products", [
      route("/", "./routes/auth/products/index.tsx"),
      route(":productId", "./routes/auth/products/$productId.tsx"),
      route(":productId/edit", "./routes/auth/products/$productId.edit.tsx"),
      route(
        ":productId/releases/new",
        "./routes/auth/products/$productId.releases.new.tsx"
      ),
      route(
        ":productId/releases/:releaseId/edit",
        "./routes/auth/products/$productId.releases.$releaseId.edit.tsx"
      ),
    ]),

    ...prefix("/licenses", [
      route("/", "./routes/auth/licenses/index.tsx"),
      route("/new", "./routes/auth/licenses/new.tsx"),
      route(":licenseId", "./routes/auth/licenses/$licenseId.tsx"),
      route(
        ":licenseId/activations/new",
        "./routes/auth/licenses/$licenseId.activations.new.tsx"
      ),
    ]),

    ...prefix("/settings", [
      layout("./routes/auth/settings/layout.tsx", [
        index("./routes/auth/settings/index.tsx"),
        route("api", "./routes/auth/settings/api.tsx"),
        route("integrations", "./routes/auth/settings/integrations.tsx"),
        route("subscription", "./routes/auth/settings/subscription.tsx"),
        route("team", "./routes/auth/settings/team.tsx"),
      ]),
    ]),

    route("support", "./routes/auth/support.tsx"),
  ]),
] satisfies RouteConfig;
