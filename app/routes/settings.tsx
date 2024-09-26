import { json, Outlet, useLoaderData } from "@remix-run/react";

export const loader = () => {
  return json({ message: "Hello from Settings!" });
};

export default function SettingsLayout() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Settings Layout</h1>
      <p>{data.values.message}</p>
      <Outlet />
    </div>
  );
}
