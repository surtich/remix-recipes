import { Prisma } from "@prisma/client";
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
    orderBy: {
      createdAt: "desc",
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

export async function deleteShelf(shelfId: string) {
  try {
    const deleted = await db.pantryShelf.delete({
      where: {
        id: shelfId,
      },
    });
    return deleted;
  } catch (error) {
    // En la traza del error del servidor se va que se produce un error de este tipo cuando se intenta borrar una estantería que no existe.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return error.message;
      }
      throw error;
    }
  }
}
