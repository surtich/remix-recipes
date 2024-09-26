import { NavLink } from "@remix-run/react";

export default function App() {
  return (
    <div>
      <h1 className="text-2xl font-bold my-4">App</h1>
      <nav className="border-b-2 pb-2 mt-2">
        <NavLink to="/pantry">Pantry</NavLink>
      </nav>
    </div>
  );
}
