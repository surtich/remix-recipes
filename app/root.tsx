import {
  isRouteErrorResponse,
  json,
  Link,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useNavigation,
  useResolvedPath,
  useRouteError,
} from "@remix-run/react";
import type {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";

import "./tailwind.css";
import {
  BookIcon,
  DiscoverIcon,
  HomeIcon,
  LoginIcon,
  LogoutIcon,
  SettingIcon,
} from "./components/icons";
import classNames from "classnames";
import { getCurrentUser } from "./utils/auth.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Remix Recipes" },
    { name: "description", content: "Welcome to Remix Recipes app!" },
  ];
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: "/theme.css" },
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

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getCurrentUser(request);

  return json({ isLoggedIn: user !== null });
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="md:flex md:h-screen bg-background">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  return (
    <>
      <nav
        className={classNames(
          "bg-primary text-white md:w-16",
          "flex justify-between md:flex-col"
        )}
      >
        <ul className="flex md:flex-col">
          <AppNavLink to="discover">
            <DiscoverIcon />
          </AppNavLink>

          {data.isLoggedIn ? (
            <AppNavLink to="app/recipes">
              <BookIcon />
            </AppNavLink>
          ) : null}

          <AppNavLink to="settings">
            <SettingIcon />
          </AppNavLink>
        </ul>
        <ul>
          {data.isLoggedIn ? (
            <AppNavLink to="/logout">
              <LogoutIcon />
            </AppNavLink>
          ) : (
            <AppNavLink to="/login">
              <LoginIcon />
            </AppNavLink>
          )}
        </ul>
      </nav>
      <div className="p-4 w-full md:w-[calc(100%-4rem)] overflow-y-auto">
        <Outlet />
      </div>
    </>
  );
}

type AppNavLinksProps = {
  to: string;
  children: React.ReactNode;
};

function AppNavLink({ to, children }: AppNavLinksProps) {
  const path = useResolvedPath(to); //to tiene una path relativa, navigation.location.pathname la tiene absoluta. Con este hook se puede obtener la ruta absoluta a partir de una relativa.
  const navigation = useNavigation();

  const isLoading =
    navigation.state == "loading" &&
    navigation.location.pathname === path.pathname &&
    navigation.formData === null;

  return (
    <li className="w-16">
      <NavLink to={to}>
        {({ isActive }) => (
          <div
            className={classNames(
              "py-4 flex justify-center hover:bg-primary-light",
              isActive ? "bg-primary-light" : "",
              isLoading ? "animate-pulse bg-primary-light" : ""
            )}
          >
            {children}
          </div>
        )}
      </NavLink>
    </li>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <html lang="en">
      <head>
        <title>Woops!</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="p-4">
          {
            // //check if the given error is an ErrorResponse generated from a 4xx/5xx Response thrown from an action/loader
            isRouteErrorResponse(error) ? (
              <>
                <h1 className="text-2xl pb-3">
                  {error.status} - {error.statusText}
                </h1>
                <p>You&apos;re seeing this page because an error ocurred.</p>
                <p className="my-4 font-bold">{error.data.message}</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl pb-3">Woops!</h1>
                <p>
                  You&apos;re seeing this page because an unexpected error
                  ocurred.
                </p>
                {error instanceof Error ? (
                  <p className="my-4 font-bold">{error.message}</p>
                ) : null}
              </>
            )
          }

          <Link to="/" className="text-primary">
            Go back to the home page
          </Link>
        </div>
      </body>
    </html>
  );
}
