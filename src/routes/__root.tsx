import { HeadContent, Scripts, createRootRoute, Link } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import { Toaster } from "@/components/ui/sonner";
import { Wordmark } from "@/components/top-nav";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center px-6">
          <Link to="/">
            <Wordmark />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-6 pt-24">
        <p className="label-caps">404</p>
        <h1 className="mt-2 text-[28px]">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The link may be old, or the page was removed.</p>
        <div className="mt-8 flex gap-4 text-sm">
          <Link to="/" className="text-vibrant hover:underline">
            Go to the homepage
          </Link>
          <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground">
            Go back
          </button>
        </div>
      </main>
    </div>
  );
}

export const Route = createRootRoute({
  notFoundComponent: NotFoundComponent,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Perpetually",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background text-foreground">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased">
        {children}
        <Toaster position="bottom-right" />
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: "bottom-left",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}
