import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import classNames from "classnames";
import React from "react";
import { z } from "zod";
import {
  DeleteButton,
  ErrorMessage,
  Input,
  PrimaryButton,
} from "~/components/forms";
import { SaveIcon, TimeIcon, TrashIcon } from "~/components/icons";
import db from "~/db.server";
import { validateForm } from "~/utils/validation";

export async function loader({ params }: LoaderFunctionArgs) {
  const recipe = await db.recipe.findUnique({
    where: { id: params.recipeId },
    include: {
      ingredients: {
        select: { id: true, name: true, amount: true },
        orderBy: { createdAt: "asc" }, // El último ingrediente añadido se muestra al final
      },
    },
  });

  return json({ recipe }, { headers: { "Cache-Control": "max-age=10" } }); // 10 seconds
}

const saveRecipeSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    totalTime: z.string().min(1, "Total time is required"),
    instructions: z.string().min(1, "Instructions is required"),
    ingredientIds: z
      .array(z.string().min(1, "Ingredient ID is required"))
      .optional(),
    ingredientAmounts: z.array(z.string().nullable()).optional(),
    ingredientNames: z.array(z.string().min(1, "Name is required")).optional(),
  })
  .refine(
    (data) =>
      data.ingredientIds?.length === data.ingredientAmounts?.length &&
      data.ingredientIds?.length === data.ingredientNames?.length,

    { message: "Ingredient amounts and names must match" }
  );

const createIngredientSchema = z.object({
  newIngredientAmount: z.string().nullable(),
  newIngredientName: z.string().min(1, "Name is required"),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const recipeId = String(params.recipeId);

  switch (formData.get("_action")) {
    case "saveRecipe": {
      return validateForm(
        formData,
        saveRecipeSchema,
        async ({
          // Está garantizado por FormData que el orden de los arrays es el mismo
          ingredientIds = [],
          ingredientAmounts = [],
          ingredientNames = [],
          ...data
        }) =>
          db.recipe.update({
            where: { id: recipeId },
            data: {
              ...data,
              ingredients: {
                updateMany: ingredientIds.map((id, index) => ({
                  where: { id },
                  data: {
                    amount: ingredientAmounts[index] as string,
                    name: ingredientNames[index] as string,
                  },
                })),
              },
            },
          }),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "createIngredient": {
      return validateForm(
        formData,
        createIngredientSchema,
        async ({ newIngredientAmount, newIngredientName }) =>
          db.ingredient.create({
            data: {
              recipeId,
              amount: newIngredientAmount ?? "",
              name: newIngredientName,
            },
          }),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    default: {
      return null;
    }
  }
}

export default function RecipeDetail() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<any>();

  return (
    <Form method="post" reloadDocument>
      <div className="mb-2">
        <Input
          key={data.recipe?.id}
          type="text"
          placeholder="Recipe Name"
          autoComplete="off"
          className="text-2xl font-extrabold"
          name="name"
          defaultValue={data.recipe?.name}
          error={!!actionData?.errors?.name}
        />
        <ErrorMessage>{actionData?.errors?.name}</ErrorMessage>
      </div>
      <div className="flex">
        <TimeIcon />
        <div className="ml-2 flex-grow">
          <Input
            key={data.recipe?.id}
            type="text"
            placeholder="Time"
            autoComplete="off"
            name="totalTime"
            defaultValue={data.recipe?.totalTime}
            error={!!actionData?.errors?.totalTime}
          />
          <ErrorMessage>{actionData?.errors?.totalTime}</ErrorMessage>
        </div>
      </div>
      <div className="grid grid-cols-[30%_auto_min-content] my-4 gap-2">
        <h2 className="font-bold text-sm pb-1">Amount</h2>
        <h2 className="font-bold text-sm pb-1">Name</h2>
        <div></div>
        {data.recipe?.ingredients.map((ingredient, idx) => (
          <React.Fragment key={ingredient.id}>
            {/* React.Fragment permite introducir una key */}
            <input type="hidden" name="ingredientIds[]" value={ingredient.id} />
            <div>
              <Input
                type="text"
                placeholder="Amount"
                autoComplete="off"
                defaultValue={ingredient.amount ?? ""}
                name="ingredientAmounts[]"
                error={!!actionData?.errors?.[`ingredientAmounts.${idx}`]}
              />
              {/* Se añade [] al name para indicar que es un array */}
              <ErrorMessage>
                {actionData?.errors?.[`ingredientAmounts.${idx}`]}
              </ErrorMessage>
            </div>
            <div>
              <Input
                type="text"
                placeholder="Name"
                autoComplete="off"
                name="ingredientNames[]"
                defaultValue={ingredient.name ?? ""}
                error={!!actionData?.errors?.[`ingredientNames.${idx}`]}
              />
              {/* Se añade [] al name para indicar que es un array */}
              <ErrorMessage>
                {!!actionData?.errors?.[`ingredientNames.${idx}`]}
              </ErrorMessage>
            </div>
            <button>
              <TrashIcon />
            </button>
          </React.Fragment>
        ))}
        <div>
          <Input
            type="text"
            autoComplete="off"
            name="newIngredientAmount"
            className="border-b-gray-200"
            error={!!actionData?.errors?.newIngredientAmount}
          />
          <ErrorMessage>{actionData?.errors?.newIngredientAmount}</ErrorMessage>
        </div>
        <div>
          <Input
            type="text"
            autoComplete="off"
            name="newIngredientName"
            className="border-b-gray-200"
            error={!!actionData?.errors?.newIngredientName}
          />
          <ErrorMessage>{actionData?.errors?.newIngredientName}</ErrorMessage>
        </div>
        <button name="_action" value="createIngredient">
          <SaveIcon />
        </button>
      </div>
      <label
        htmlFor="instructions"
        className="block font-bold text-sm pb-2 w-fit"
      >
        Instructions
      </label>
      <textarea
        key={data.recipe?.id}
        id="instructions"
        name="instructions"
        placeholder="Instructions go here"
        className={classNames(
          "w-full h-56 rounded-md outline-none",
          "focus:border-2 focus:p-3 focus:border-primary duration-300",
          actionData?.errors?.instructions ? "border-red-500 p-3" : ""
        )}
        defaultValue={data.recipe?.instructions}
      />
      <ErrorMessage>{actionData?.errors?.instructions}</ErrorMessage>
      <hr className="my-4" />
      <div className="flex justify-between">
        <DeleteButton>Delete this Recipe</DeleteButton>
        <PrimaryButton name="_action" value="saveRecipe">
          <div className="flex flex-col justify-center h-full">Save</div>
        </PrimaryButton>
      </div>
    </Form>
  );
}
