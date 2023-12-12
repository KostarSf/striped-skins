import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import styles from "./tailwind.css";
import { useEffect } from "react";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: styles },
];

export default function App() {
  useEffect(() => {
    function preventDefault(e: TouchEvent) {
      e.preventDefault();
    }

    document.body.addEventListener("touchmove", preventDefault, {
      passive: false,
    });

    return () => {
      document.body.removeEventListener('touchmove', preventDefault)
    }
  }, []);

  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='theme-color' content='rgb(51, 51, 51)' />
        <meta name='msapplication-navbutton-color' content='rgb(51, 51, 51)' />
        <meta
          name='apple-mobile-web-app-status-bar-style'
          content='rgb(51, 51, 51)'
        />

        <Meta />
        <Links />
      </head>
      <body className="overflow-clip">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
