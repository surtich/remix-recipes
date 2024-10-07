import db from "~/db.server";
import { requiredLoggedInUser } from "./auth.server";
import { json } from "@remix-run/node";

export async function canChangeRecipe(request: Request, recipeId: string) {
  const user = await requiredLoggedInUser(request);

  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
  });

  if (recipe === null) {
    throw json({ message: "Recipe not found" }, { status: 404 });
  }

  if (recipe.userId !== user.id) {
    throw json(
      { message: "You're not authorized to make changes on this recipe" },
      { status: 401 }
    );
  }
}
