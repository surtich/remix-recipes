import { json, Outlet } from "@remix-run/react";
import { useMatchesData } from "~/utils/misc";

export const loader = () => {
  return json({ message: "Hello from Settings!" });
};

export default function SettingsLayout() {
  const data = useMatchesData("routes/settings.profile");
  return (
    <div>
      <h1>Settings Layout</h1>
      <p>{data?.message}</p>
      <Outlet />
    </div>
  );
}
