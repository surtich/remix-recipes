import { Action } from "@prisma/client/runtime/library";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { z } from "zod";
import { CheckCircleIcon } from "~/components/icons";
import db from "~/db.server";
import { requiredLoggedInUser } from "~/utils/auth.server";
import { validateForm } from "~/utils/validation";

type GroceryListItem = {
  id: string;
  name: string;
  uses: Array<{
    id: string;
    amount: string | null;
    recipeName: string;
    multiplier: number;
  }>;
};

function isMatch(ingredientName: string, pantryItemName: string) {
  // TODO: habría que mejorar esto usando expresiones regulares.
  return ingredientName.toLowerCase() === pantryItemName.toLowerCase();
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requiredLoggedInUser(request);

  const ingredients = await db.ingredient.findMany({
    where: {
      recipe: {
        userId: user.id,
        mealPlanMultiplier: { not: null },
      },
    },
    include: {
      recipe: {
        select: {
          name: true,
          mealPlanMultiplier: true,
        },
      },
    },
  });

  const pantryItems = await db.pantryItem.findMany({
    where: {
      userId: user.id,
    },
  });

  const missingIngredients = ingredients.filter(
    (ingredient) =>
      !pantryItems.find((pantryItem) =>
        isMatch(ingredient.name, pantryItem.name)
      )
  );

  const groceryListItems = missingIngredients.reduce<{
    [key: string]: GroceryListItem;
  }>((groceryListItemsMapSoFar, ingredient) => {
    const ingredientName = ingredient.name.toLowerCase(); // TODO: mejorar con expresiones regulares
    const existing = groceryListItemsMapSoFar[ingredientName] ?? { uses: [] };

    return {
      ...groceryListItemsMapSoFar,
      [ingredientName]: {
        id: ingredient.id,
        name: ingredientName,
        uses: [
          ...existing.uses,
          {
            id: ingredient.recipeId,
            amount: ingredient.amount,
            recipeName: ingredient.recipe.name,
            multiplier: ingredient.recipe.mealPlanMultiplier!, // estamos seguro de que la receta está en el mealPlanMultiplier,
          },
        ],
      },
    };
  }, {});

  return { groceryListItems: Object.values(groceryListItems) };
}

// Obtiene la estantería de la lista de compras
function getGroceryTripShelfName() {
  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  return `Grocery Trip - ${date}`;
}

const checkOffItemSchema = z.object({
  name: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
  const user = await requiredLoggedInUser(request);
  const formData = await request.formData();

  switch (formData.get("_action")) {
    case "checkOffItem": {
      return validateForm(
        formData,
        checkOffItemSchema,
        async ({ name }) => {
          const shelfName = getGroceryTripShelfName();
          let shoppingTripShelf = await db.pantryShelf.findFirst({
            where: {
              name: shelfName,
              userId: user.id,
            },
          });

          if (shoppingTripShelf === null) {
            shoppingTripShelf = await db.pantryShelf.create({
              data: {
                name: shelfName,
                userId: user.id,
              },
            });
          }

          return db.pantryItem.create({
            data: {
              name,
              shelfId: shoppingTripShelf.id,
              userId: user.id,
            },
          });
        },
        (errors) => json({ errors }, { status: 400 })
      );
    }

    default: {
      return null;
    }
  }
}

function GroceryListItem({ item }: { item: GroceryListItem }) {
  const fetcher = useFetcher();
  return fetcher.state !== "idle" ? null : (
    <div className="shadow-md rounded-md p-4 flex">
      <div className="flex-grow">
        <h1 className="text-sm font-bold mb-2 uppercase">{item.name}</h1>
        <ul>
          {item.uses.map((use) => (
            <li key={use.id} className="py-1">
              {use.amount} for {use.recipeName} (x{use.multiplier})
            </li>
          ))}
        </ul>
      </div>
      <fetcher.Form method="post" className="flex flex-col justify-center">
        <input type="hidden" name="name" value={item.name} />
        <button
          name="_action"
          value="checkOffItem"
          className="hover:text-primary"
        >
          <CheckCircleIcon />
        </button>
      </fetcher.Form>
    </div>
  );
}

export default function GroceryList() {
  const data = useLoaderData<typeof loader>();
  return data.groceryListItems.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {data.groceryListItems.map((item) => (
        <GroceryListItem key={item.id} item={item} />
      ))}
    </div>
  ) : (
    <div className="w-fit m-auto text-center py-16">
      <h1 className="text-3xl">All set!</h1>
      <div className="text-primary flex justify-center items-center py-4">
        <CheckCircleIcon large />
        <p>You have everything you need</p>
      </div>
    </div>
  );
}
