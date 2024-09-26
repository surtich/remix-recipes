import { LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";

export const loader: LoaderFunction = () => {
  return new Response(JSON.stringify({ message: "Hello from the loader!" }), {
    status: 418,
    headers: {
      "Content-Type": "application/json",
      custom: "hey",
    },
  });
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
