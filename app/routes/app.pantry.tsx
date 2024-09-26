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
          <li key={shelf.id}>{shelf.name}</li>
        ))}
      </ul>
    </div>
  );
}
