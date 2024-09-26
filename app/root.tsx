import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";

import "./tailwind.css";
import {
  BookIcon,
  DiscoverIcon,
  HomeIcon,
  SettingIcon,
} from "./components/icons";

export const meta: MetaFunction = () => {
  return [
    { title: "Remix Recipes" },
    { name: "description", content: "Welcome to Remix Recipes app!" },
  ];
};

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex h-screen">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <nav className="bg-primary text-white">
        <ul className="flex flex-col">
          <AppNavLink to="/">
            <HomeIcon />
          </AppNavLink>

          <AppNavLink to="discover">
            <DiscoverIcon />
          </AppNavLink>

          <AppNavLink to="app">
            <BookIcon />
          </AppNavLink>

          <AppNavLink to="settings">
            <SettingIcon />
          </AppNavLink>
        </ul>
      </nav>
      <Outlet />
    </>
  );
}

type AppNavLinksProps = {
  to: string;
  children: React.ReactNode;
};

function AppNavLink({ to, children }: AppNavLinksProps) {
  return (
    <li className="w-16">
      <Link to={to}>
        <div className="py-4 flex justify-center hover:bg-primary-light">
          {children}
        </div>
      </Link>
    </li>
  );
}
