import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function crearUser() {
  return db.user.create({
    data: {
      email: "me@example.com",
      firstName: "Alice",
      lastName: "Johnson",
    },
  });
}

function getShelves(userId: string) {
  return [
    {
      userId,
      name: "Dairy",
      items: {
        create: [
          { userId, name: "Milk" },
          { userId, name: "Eggs" },
          { userId, name: "Cheese" },
        ],
      },
    },
    {
      userId,
      name: "Fruits",
      items: {
        create: [
          { userId, name: "Apples" },
          { userId, name: "Oranges" },
          { userId, name: "Grapes" },
        ],
      },
    },
  ];
}
async function seed() {
  const user = await crearUser();
  await Promise.all(
    getShelves(user.id).map((shelf) => db.pantryShelf.create({ data: shelf }))
  );
}

seed();
