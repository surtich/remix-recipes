import db from "~/db.server";

export function getAllShelves(query: string | null) {
  return db.pantryShelf.findMany({
    where: {
      name: {
        contains: query ?? "",
        mode: "insensitive",
      },
    },
    include: {
      items: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });
}

export function createShelf() {
  return db.pantryShelf.create({
    data: {
      name: "New Shelf",
    },
  });
}
