import { PrismaClient } from "@prisma/client";
import { json, useLoaderData } from "@remix-run/react";

export const loader = async () => {
  const db = new PrismaClient();
  const shelves = await db.pantryShelf.findMany();
  return json(shelves);
};

export default function Pantry() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Welcome to the pantry :)</h1>
      <ul>
        {data.map((shelf) => (
          <li key={shelf.id}>{shelf.name}</li>
        ))}
      </ul>
    </div>
  );
}
