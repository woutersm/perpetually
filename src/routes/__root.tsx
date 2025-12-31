import { HeadContent, Scripts, createRootRoute, Link } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Home, ArrowLeft } from "lucide-react";

import { ThemeProvider } from "@/lib/theme-context";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-vibrant to-vibrant/80 shadow-lg shadow-vibrant/25">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Perpetually</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="text-center max-w-md">
          {/* 404 Visual */}
          <div className="relative mb-8">
            <div className="text-[10rem] font-bold leading-none text-muted-foreground/10 select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-vibrant/10 to-vibrant/5 border border-vibrant/20">
                <Home className="h-12 w-12 text-vibrant" />
              </div>
            </div>
          </div>

          {/* Text */}
          <h1 className="text-3xl font-bold tracking-tight mb-3">Page not found</h1>
          <p className="text-muted-foreground mb-8">
            Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vibrant to-vibrant/90 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-vibrant/25 hover:shadow-xl hover:shadow-vibrant/30 transition-all"
            >
              <Home className="h-4 w-4" />
              Go to Homepage
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-6 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Perpetually. All rights reserved.
        </div>
      </footer>
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
    <html lang="en" className="dark bg-background text-foreground">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ThemeProvider>
          {children}
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
}
