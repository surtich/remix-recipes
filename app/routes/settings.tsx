import { json, Outlet, useLoaderData } from "@remix-run/react";

export const loader = () => {
  return json({ message: "Hello from the loader!" });
};

export default function SettingsLayout() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Settings Layout</h1>
      <p>{data.message}</p>
      <Outlet />
    </div>
  );
}
