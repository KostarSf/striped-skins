import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { cssBundleHref } from "@remix-run/css-bundle";
import styles from "./tailwind.css";
import type { LinksFunction, MetaFunction } from "@remix-run/node";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: styles },
];

export const meta: MetaFunction = () => {
  return [
    { title: "Striped Skins - Mine Little Pony skin viewer" },
    {
      name: "description",
      content: "Watch and compare your awesome pony skins!",
    },
  ];
};

export default function App() {
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

        <meta property='og:image' content='/icon.png' />
        <meta
          property='og:title'
          content='Striped Skins - Mine Little Pony skin viewer'
        />
        <meta
          property='og:description'
          content='Watch and compare your awesome pony skins!'
        />

        <Meta />
        <Links />

        <link rel="manifest" href="manifest.json" />
      </head>
      <body className='overflow-clip'>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
