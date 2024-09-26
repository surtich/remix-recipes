import { json, useLoaderData } from "@remix-run/react";
import classNames from "classnames";
import { getAllShelves } from "~/models/pantry-shelf.server";

export const loader = async () => {
  const shelves = await getAllShelves();
  return json(shelves);
};

export default function Pantry() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <ul className={classNames("flex gap-8 overflow-x-auto")}>
        {data.map((shelf) => (
          <li
            key={shelf.id}
            className={classNames(
              "border-2 border-primary rounded-md p-4",
              "w-screen flex-none"
            )}
          >
            <h1 className="text-2xl font-extrabold">{shelf.name}</h1>
          </li>
        ))}
      </ul>
    </div>
  );
}
