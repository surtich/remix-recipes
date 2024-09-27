import { Prisma } from "@prisma/client";

export async function handleDelete<T>(deleteFn: () => T) {
  try {
    const deleted = deleteFn();
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
