import { LoaderFunction } from "@remix-run/node";
import { json, Outlet, useLoaderData } from "@remix-run/react";

export const loader: LoaderFunction = () => {
  return json(
    { message: "Hello from the loader!" },
    {
      status: 418,
      headers: { custom: "hey" },
    }
  );
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
