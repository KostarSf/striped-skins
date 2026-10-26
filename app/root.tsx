import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import styles from "./tailwind.css?url";
import type { LinksFunction, MetaFunction } from "react-router";
import { WorkspaceBoundary } from "./components/WorkspaceBoundary";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

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
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <MetaThemeTags />

        <meta property="og:image" content="/icon.png" />
        <meta property="og:title" content="Striped Skins - Mine Little Pony skin viewer" />
        <meta property="og:description" content="Watch and compare your awesome pony skins!" />

        <Meta />
        <Links />

        <LinkIconsTags />
        <link rel="manifest" href="manifest.json" />
      </head>
      <body className="overflow-clip">
        <WorkspaceBoundary>
          <Outlet />
        </WorkspaceBoundary>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function LinkIconsTags() {
  return (
    <>
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#bfa5ff" />
    </>
  );
}

function MetaThemeTags() {
  return (
    <>
      <meta name="apple-mobile-web-app-title" content="Striped Skins" />
      <meta name="application-name" content="Striped Skins" />
      <meta name="msapplication-TileColor" content="#da532c" />
      <meta name="theme-color" content="rgb(51, 51, 51)" />
      <meta name="msapplication-navbutton-color" content="rgb(51, 51, 51)" />
      <meta name="apple-mobile-web-app-status-bar-style" content="rgb(51, 51, 51)" />
    </>
  );
}
