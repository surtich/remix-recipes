import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import {
  Form,
  isRouteErrorResponse,
  useActionData,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import classNames from "classnames";
import React from "react";
import { FetchResult } from "vite/runtime";
import { z } from "zod";
import {
  DeleteButton,
  ErrorMessage,
  Input,
  PrimaryButton,
} from "~/components/forms";
import { SaveIcon, TimeIcon, TrashIcon } from "~/components/icons";
import db from "~/db.server";
import { handleDelete } from "~/models/utils";
import { requiredLoggedInUser } from "~/utils/auth.server";
import { validateForm } from "~/utils/validation";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requiredLoggedInUser(request);
  const recipe = await db.recipe.findUnique({
    where: { id: params.recipeId },
    include: {
      ingredients: {
        select: { id: true, name: true, amount: true },
        orderBy: { createdAt: "asc" }, // El último ingrediente añadido se muestra al final
      },
    },
  });

  if (recipe === null) {
    throw json({ message: "Recipe not found" }, { status: 404 });
  }

  if (recipe.userId !== user.id) {
    throw json(
      { message: "You're not authorized to view this recipe" },
      { status: 401 }
    );
  }

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
  const user = await requiredLoggedInUser(request);
  const recipeId = String(params.recipeId);

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

  const formData = await request.formData();
  const _action = formData.get("_action");

  if (typeof _action === "string" && _action.startsWith("deleteIngredient.")) {
    const ingredientId = _action.split(".")[1];
    return handleDelete(() =>
      db.ingredient.delete({ where: { id: ingredientId } })
    );
  }

  switch (_action) {
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
    case "deleteRecipe": {
      await handleDelete(() => db.recipe.delete({ where: { id: recipeId } }));
      return redirect("/app/recipes");
    }
    default: {
      return null;
    }
  }
}

export default function RecipeDetail() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<any>();
  const saveNameFetcher = useFetcher<any>();
  const saveTotalTimeFetcher = useFetcher<any>();
  const saveInstructionsFetcher = useFetcher<any>();

  const saveName = (name: string) =>
    saveNameFetcher.submit(
      {
        _action: "saveName",
        name,
      },
      { method: "post" }
    );

  const saveTotalTime = (totalTime: string) =>
    saveTotalTimeFetcher.submit(
      {
        _action: "saveTotalTime",
        totalTime,
      },
      { method: "post" }
    );

  const saveInstructions = (instructions: string) =>
    saveInstructionsFetcher.submit(
      {
        _action: "saveInstructions",
        instructions,
      },
      { method: "post" }
    );

  return (
    <Form method="post" reloadDocument>
      <div className="mb-2">
        <Input
          key={data.recipe.id}
          type="text"
          placeholder="Recipe Name"
          autoComplete="off"
          className="text-2xl font-extrabold"
          name="name"
          defaultValue={data.recipe.name}
          error={
            !!(saveNameFetcher?.data?.errors?.name || actionData?.errors?.name)
          }
          onChange={(e) => saveName(e.target.value)}
        />
        {/* actionData sólo contiene errores si se produce una recarga de la página cnado se pulsa save, por eso se añaden los errores del fetcher */}
        <ErrorMessage>
          {saveNameFetcher?.data?.errors?.name || actionData?.errors?.name}
        </ErrorMessage>
      </div>
      <div className="flex">
        <TimeIcon />
        <div className="ml-2 flex-grow">
          <Input
            key={data.recipe.id}
            type="text"
            placeholder="Time"
            autoComplete="off"
            name="totalTime"
            defaultValue={data.recipe.totalTime}
            error={
              !!(
                saveTotalTimeFetcher?.data?.errors?.totalTime ||
                actionData?.errors?.totalTime
              )
            }
            onChange={(e) => saveTotalTime(e.target.value)}
          />
          <ErrorMessage>
            {saveTotalTimeFetcher?.data?.errors?.totalTime ||
              actionData?.errors?.totalTime}
          </ErrorMessage>
        </div>
      </div>
      <div className="grid grid-cols-[30%_auto_min-content] my-4 gap-2">
        <h2 className="font-bold text-sm pb-1">Amount</h2>
        <h2 className="font-bold text-sm pb-1">Name</h2>
        <div></div>
        {data.recipe.ingredients.map((ingredient, idx) => (
          <IngredientRow
            key={ingredient.id}
            id={ingredient.id}
            amount={ingredient.amount}
            name={ingredient.name}
            amountError={actionData?.errors?.[`ingredientAmounts.${idx}`]}
            nameError={actionData?.errors?.[`ingredientNames.${idx}`]}
          />
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
        key={data.recipe.id}
        id="instructions"
        name="instructions"
        placeholder="Instructions go here"
        className={classNames(
          "w-full h-56 rounded-md outline-none",
          "focus:border-2 focus:p-3 focus:border-primary duration-300",
          !!(
            saveInstructionsFetcher?.data?.errors?.instructions ||
            actionData?.errors?.instructions
          )
            ? "border-red-500 p-3"
            : ""
        )}
        defaultValue={data.recipe.instructions}
        onChange={(e) => saveInstructions(e.target.value)}
      />
      <ErrorMessage>
        {saveInstructionsFetcher?.data?.errors?.instructions ||
          actionData?.errors?.instructions}
      </ErrorMessage>
      <hr className="my-4" />
      <div className="flex justify-between">
        <DeleteButton name="_action" value="deleteRecipe">
          Delete this Recipe
        </DeleteButton>
        <PrimaryButton name="_action" value="saveRecipe">
          <div className="flex flex-col justify-center h-full">Save</div>
        </PrimaryButton>
      </div>
    </Form>
  );
}

// Hemos tenido que extraer el ingrediente a un componente para usarlo con un fetcher.
// Los fecherts son hooks y, según las reglas de hooks, no se pueden usar en un bucle.
// Ver: https://es.reactjs.org/docs/hooks-rules.html

type IngredientRowProps = {
  id: string;
  amount: string | null;
  amountError?: string;
  name: string;
  nameError?: string;
};

function IngredientRow({
  id,
  amount,
  amountError,
  name,
  nameError,
}: IngredientRowProps) {
  return (
    <React.Fragment>
      {/* React.Fragment permite introducir una key */}
      <input type="hidden" name="ingredientIds[]" value={id} />
      <div>
        <Input
          type="text"
          placeholder="Amount"
          autoComplete="off"
          defaultValue={amount ?? ""}
          name="ingredientAmounts[]"
          error={!!amountError}
        />
        {/* Se añade [] al name para indicar que es un array */}
        <ErrorMessage>{amountError}</ErrorMessage>
      </div>
      <div>
        <Input
          type="text"
          placeholder="Name"
          autoComplete="off"
          name="ingredientNames[]"
          defaultValue={name ?? ""}
          error={!!nameError}
        />
        {/* Se añade [] al name para indicar que es un array */}
        <ErrorMessage>{nameError}</ErrorMessage>
      </div>
      <button name="_action" value={`deleteIngredient.${id}`}>
        <TrashIcon />
      </button>
    </React.Fragment>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="bg-red-600 text-white rounded-md p-4">
        <h1 className="mb-2">
          {error.status} - {error.statusText}
        </h1>
        <p>{error.data.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-red-600 text-white rounded-md p-4">
      <h1 className="mb-2">An unexpected error ocurred.</h1>
    </div>
  );
}
