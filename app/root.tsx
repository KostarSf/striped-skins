import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import styles from "./tailwind.css?url";
import type { LinksFunction, MetaFunction } from "react-router";
import { WorkspaceBoundary } from "./components/WorkspaceBoundary";
import { useTranslation } from "react-i18next";
import { getInstance, getLocale, i18nextMiddleware } from "./i18n/middleware.server";
import type { Route } from "./+types/root";

export const middleware = [i18nextMiddleware];

export function loader({ context }: Route.LoaderArgs) {
  const t = getInstance(context).t;
  return { locale: getLocale(context), title: t("meta.title"), description: t("meta.description") };
}

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
  return [
    { title: loaderData?.title },
    {
      name: "description",
      content: loaderData?.description,
    },
    { property: "og:title", content: loaderData?.title },
    { property: "og:description", content: loaderData?.description },
  ];
};

export default function App() {
  const { i18n } = useTranslation();
  return (
    <html lang={i18n.language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        <MetaThemeTags />

        <meta property="og:image" content="/icon.png" />

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
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#f97316" />
    </>
  );
}

function MetaThemeTags() {
  return (
    <>
      <meta name="apple-mobile-web-app-title" content="Striped Skins" />
      <meta name="application-name" content="Striped Skins" />
      <meta name="msapplication-TileColor" content="#da532c" />
      <meta name="theme-color" content="#212228" />
      <meta name="msapplication-navbutton-color" content="#212228" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    </>
  );
}
