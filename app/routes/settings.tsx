import { LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";

export const loader: LoaderFunction = () => {
  return { message: "Hello from the loader!" };
};

export default function SettingsLayout() {
  const data = useLoaderData();
  return (
    <div>
      <h1>Settings Layout</h1>
      <p>{data.message}</p>
      <Outlet />
    </div>
  );
}
