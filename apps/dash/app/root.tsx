import {
  data,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import "./tailwind.css";
import { LinksFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import { siteConfig } from "./config";
import { Toaster } from "./components/ui/sonner";
import { getToast } from "remix-toast";
import { useEffect } from "react";
import { toast as sonnerToast } from "sonner";

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: "https://rsms.me/inter/inter.css" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css?family=IBM Plex Mono",
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css?family=Inter",
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css?family=Lexend",
    },
  ];
};

export const meta: MetaFunction = () => {
  return [
    { title: siteConfig.name },
    {
      property: "og:title",
      content: siteConfig.name,
    },
    {
      name: "description",
      content: siteConfig.description,
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { toast, headers } = await getToast(request);

  return data({ toast }, { headers });
};

export default function App() {
  const { toast } = useLoaderData<typeof loader>();

  useEffect(() => {
    if (toast) {
      if (toast.type === "success") {
        sonnerToast.success(toast.message);
      }

      if (toast.type === "error") {
        sonnerToast.error(toast.message);
      }
    }
  }, [toast]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <Toaster toastOptions={{}} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
