import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
  unstable_composeUploadHandlers,
  unstable_createFileUploadHandler,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import {
  Form,
  isRouteErrorResponse,
  Link,
  Outlet,
  useActionData,
  useFetcher,
  useLoaderData,
  useOutletContext,
  useRouteError,
} from "@remix-run/react";
import classNames from "classnames";
import React from "react";
import { z } from "zod";
import {
  DeleteButton,
  ErrorMessage,
  Input,
  PrimaryButton,
} from "~/components/forms";
import {
  CalendarIcon,
  SaveIcon,
  TimeIcon,
  TrashIcon,
} from "~/components/icons";
import db from "~/db.server";
import { handleDelete } from "~/models/utils";
import { requiredLoggedInUser } from "~/utils/auth.server";
import { useDebouncedFunction, useServerLayoutEffect } from "~/utils/misc";
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

const saveNameSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const saveTotalTimeSchema = z.object({
  totalTime: z.string().min(1, "Total time is required"),
});

const saveInstructionsSchema = z.object({
  instructions: z.string().min(1, "Instructions is required"),
});

const ingredientId = z.string().min(1, "Ingredient ID is required");
const ingredientAmount = z.string().nullable();
const ingredientName = z.string().min(1, "Ingredient name is required");

const saveIngredientAmountSchema = z.object({
  amount: ingredientAmount,
  id: ingredientId,
});

const saveIngredientNameSchema = z.object({
  name: ingredientName,
  id: ingredientId,
});

const saveRecipeSchema = z
  .object({
    imageUrl: z.string().optional(),
    ingredientIds: z.array(ingredientId).optional(),
    ingredientAmounts: z.array(ingredientAmount).optional(),
    ingredientNames: z.array(ingredientName).optional(),
  })
  .and(saveNameSchema) // para no repetir las validaciones de name, totalTime e instructions se reutilizan sus esquemas.
  .and(saveTotalTimeSchema)
  .and(saveInstructionsSchema)
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

  let formData: FormData;
  if (request.headers.get("Content-Type")?.includes("multipart/form-data")) {
    /* Esta sería una función genérica para manejar un formulario multipart.
       Sin embargo, Remix tiene funciones específicas para casos característicos.
    const uploadHandler = ({ fileName, contentType, name, data }) => {
      // return File | string | null | undefined // Si esta función retorna File o String, la función parseMultipartFormData() incluye el resultado en el objeto formData
      
    };
    */
    /* Esta función haría lo mismo que request.formData() que es ineficiente al trabajar en memoria con el fichero completo. 
    const uploadHandler = unstable_createMemoryUploadHandler();
    */

    /* Esta función es más eficiente al trabajar con ficheros grandes, ya que los guarda en disco haciendo streaming.
    El problema es que sólo puede trabajar con ficheros, no con atributos calve=valor.
    const uploadHandler = unstable_createFileUploadHandler();
    */

    /* Esta función usa primero el primer uploadHadler y  si retorna null o undefined usa el segundo-
    El orden es importante porque el primer handler se ejecuta primero y sin
    ponemos un memoryUploadHandler primero funcionará con todos los parámetros, aunque de forma ineficiente para ficheros, y nunca se ejecutará el segundo.
    */
    const uploadHandler = unstable_composeUploadHandlers(
      unstable_createFileUploadHandler({
        directory: "public/images", // el directorio public de Remix es públicamente accesible.
      }), // por defecto almacena la imagen en el directorio temporal de node (ejecutar en node os.tmpdir()).
      unstable_createMemoryUploadHandler()
    );
    formData = await unstable_parseMultipartFormData(request, uploadHandler);
    const image = formData.get("image") as File;

    if (image.size !== 0) {
      const imageUrl = `/images/${image.name}`;
      formData.set("imageUrl", imageUrl);
    }
  } else {
    formData = await request.formData();
  }

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

    case "saveName": {
      return validateForm(
        formData,
        saveNameSchema,
        async (data) => db.recipe.update({ where: { id: recipeId }, data }),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "saveTotalTime": {
      return validateForm(
        formData,
        saveTotalTimeSchema,
        async (data) => db.recipe.update({ where: { id: recipeId }, data }),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "saveInstructions": {
      return validateForm(
        formData,
        saveInstructionsSchema,
        async (data) => db.recipe.update({ where: { id: recipeId }, data }),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "saveIngredientAmount": {
      return validateForm(
        formData,
        saveIngredientAmountSchema,
        async ({ amount, id }) =>
          db.ingredient.update({ where: { id }, data: { amount } }),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "saveIngredientName": {
      return validateForm(
        formData,
        saveIngredientNameSchema,
        async ({ name, id }) =>
          db.ingredient.update({ where: { id }, data: { name } }),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    default: {
      return null;
    }
  }
}

export function useRecipeContext() {
  return useOutletContext<{
    recipeName?: string;
    mealPlanMultiplier: number | null;
  }>();
}

export default function RecipeDetail() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<any>();
  const saveNameFetcher = useFetcher<any>();
  const saveTotalTimeFetcher = useFetcher<any>();
  const saveInstructionsFetcher = useFetcher<any>();
  const createIngredientFetcher = useFetcher<any>();
  const newIngredientAmountRef = React.useRef<HTMLInputElement>(null);

  const { renderedIngredients, addIngredient } = useOptimisticIngredients(
    data.recipe.ingredients,
    createIngredientFetcher.state
  );

  // Creamos este estado para la actualización optimista de la creación de ingredientes.
  // El botón añadir ingrediente necesita acceder a los dos inputs, por lo que lo convertimos en un formulario controlado.
  const [createIngredientForm, setCreateIngredientForm] = React.useState({
    amount: "",
    name: "",
  });

  const saveName = useDebouncedFunction((name: string) =>
    saveNameFetcher.submit(
      {
        _action: "saveName",
        name,
      },
      { method: "post" }
    )
  );

  const saveTotalTime = useDebouncedFunction((totalTime: string) =>
    saveTotalTimeFetcher.submit(
      {
        _action: "saveTotalTime",
        totalTime,
      },
      { method: "post" }
    )
  );

  const saveInstructions = useDebouncedFunction((instructions: string) =>
    saveInstructionsFetcher.submit(
      {
        _action: "saveInstructions",
        instructions,
      },
      { method: "post" }
    )
  );

  const createIngredient = () => {
    addIngredient(createIngredientForm.amount, createIngredientForm.name);

    // no hace falta pasar parámetros porque ya están en el estado
    createIngredientFetcher.submit(
      {
        _action: "createIngredient",
        newIngredientAmount: createIngredientForm.amount, // el nombre, newIngredientAmount, debe coincidir con el que se da en la acción createIngredient
        newIngredientName: createIngredientForm.name,
      },
      { method: "post" }
    );
    setCreateIngredientForm({ amount: "", name: "" });
    newIngredientAmountRef.current?.focus();
  };

  return (
    <>
      <Outlet
        context={{
          recipeName: data.recipe?.name,
          mealPlanMultiplier: data.recipe?.mealPlanMultiplier,
        }}
      />
      <Form method="post" encType="multipart/form-data" reloadDocument>
        <button name="_action" value="saveRecipe" className="hidden"></button>
        <div className="flex mb-2 ">
          <Link
            replace
            to="update-meal-plan"
            className="flex flex-col justify-center"
          >
            <CalendarIcon />
          </Link>
          <div className="ml-2 flex-grow">
            <Input
              key={data.recipe.id}
              type="text"
              placeholder="Recipe Name"
              autoComplete="off"
              className="text-2xl font-extrabold"
              name="name"
              defaultValue={data.recipe.name}
              error={
                !!(
                  saveNameFetcher?.data?.errors?.name ||
                  actionData?.errors?.name
                )
              }
              onChange={(e) => saveName(e.target.value)}
            />
            {/* actionData sólo contiene errores si se produce una recarga de la página cnado se pulsa save, por eso se añaden los errores del fetcher */}
            <ErrorMessage>
              {saveNameFetcher?.data?.errors?.name || actionData?.errors?.name}
            </ErrorMessage>
          </div>
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
          {renderedIngredients.map((ingredient, idx) => (
            <IngredientRow
              key={ingredient.id}
              id={ingredient.id}
              amount={ingredient.amount}
              name={ingredient.name}
              amountError={actionData?.errors?.[`ingredientAmounts.${idx}`]}
              nameError={actionData?.errors?.[`ingredientNames.${idx}`]}
              isOptimistic={ingredient.isOptimistic}
            />
          ))}
          <div>
            <Input
              ref={newIngredientAmountRef}
              type="text"
              autoComplete="off"
              name="newIngredientAmount"
              className="border-b-gray-200"
              error={
                !!(
                  createIngredientFetcher.data?.errors?.newIngredientAmount ??
                  actionData?.errors?.newIngredientAmount
                )
              }
              value={createIngredientForm.amount}
              onChange={(e) =>
                setCreateIngredientForm((values) => ({
                  ...values,
                  amount: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createIngredient();
                }
              }}
            />
            <ErrorMessage>
              {createIngredientFetcher.data?.errors?.newIngredientAmount ??
                actionData?.errors?.newIngredientAmount}
            </ErrorMessage>
          </div>
          <div>
            <Input
              type="text"
              autoComplete="off"
              name="newIngredientName"
              className="border-b-gray-200"
              error={
                !!(
                  createIngredientFetcher.data?.errors?.newIngredientName ??
                  actionData?.errors?.newIngredientName
                )
              }
              value={createIngredientForm.name}
              onChange={(e) =>
                setCreateIngredientForm((values) => ({
                  ...values,
                  name: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createIngredient();
                }
              }}
            />
            <ErrorMessage>
              {createIngredientFetcher.data?.errors?.newIngredientName ??
                actionData?.errors?.newIngredientName}
            </ErrorMessage>
          </div>
          <button
            name="_action"
            value="createIngredient"
            onClick={(e) => {
              e.preventDefault();
              createIngredient();
            }}
          >
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
        <label
          htmlFor="image"
          className="block font-bold text-sm pb-2 w-fit mt-4"
        >
          Image
        </label>
        <input
          type="file"
          id="image"
          name="image"
          key={`${data.recipe?.id}.image`} // Se necesita una key para que cuando se cambie de receta, se actualice la imagen.
        />
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
    </>
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
  isOptimistic?: boolean;
};

function IngredientRow({
  id,
  amount,
  amountError,
  name,
  nameError,
  isOptimistic,
}: IngredientRowProps) {
  const saveAmountFetcher = useFetcher<any>();
  const saveNameFetcher = useFetcher<any>();
  const deleteIngredientFetcher = useFetcher<any>();

  const saveAmount = useDebouncedFunction((amount: string) =>
    saveAmountFetcher.submit(
      {
        _action: "saveIngredientAmount",
        amount,
        id,
      },
      { method: "post" }
    )
  );

  const saveName = useDebouncedFunction((name: string) =>
    saveNameFetcher.submit(
      {
        _action: "saveIngredientName",
        name,
        id,
      },
      { method: "post" }
    )
  );

  return deleteIngredientFetcher.state !== "idle" ? null : (
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
          error={!!(saveAmountFetcher?.data?.errors?.amount ?? amountError)}
          onChange={(e) => saveAmount(e.target.value)}
          disabled={isOptimistic}
        />
        <ErrorMessage>
          {saveAmountFetcher?.data?.errors?.amount ?? amountError}
        </ErrorMessage>
      </div>
      <div>
        <Input
          type="text"
          placeholder="Name"
          autoComplete="off"
          name="ingredientNames[]"
          defaultValue={name ?? ""}
          error={!!(saveNameFetcher?.data?.errors?.name ?? nameError)}
          onChange={(e) => saveName(e.target.value)}
          disabled={isOptimistic}
        />
        <ErrorMessage>
          {saveNameFetcher?.data?.errors?.name ?? nameError}
        </ErrorMessage>
      </div>
      <button
        name="_action"
        value={`deleteIngredient.${id}`}
        onClick={(e) => {
          e.preventDefault();
          deleteIngredientFetcher.submit(
            { _action: `deleteIngredient.${id}` },
            { method: "post" }
          );
        }}
      >
        <TrashIcon />
      </button>
    </React.Fragment>
  );
}

type RenderedIngredient = {
  id: string;
  name: string;
  amount: string | null;
  isOptimistic?: boolean;
};

function useOptimisticIngredients(
  savedIngredients: Array<RenderedIngredient>,
  createShelfIngredientState: "idle" | "submitting" | "loading"
) {
  const [optimisticIngredients, setOptimisticIngredients] = React.useState<
    Array<RenderedIngredient>
  >([]);

  const renderedIngredients = [...savedIngredients, ...optimisticIngredients]; // Se cambia el orden respecto a lo que se hizo en recipe porque los ingredientes añadidos están al final de la lista.

  useServerLayoutEffect(() => {
    // este estado se alcanza cuando el fetcher ha finalizado la revalidación
    if (createShelfIngredientState === "idle") {
      setOptimisticIngredients([]);
    }
  }, [createShelfIngredientState]);

  const addIngredient = (amount: string | null, name: string) => {
    setOptimisticIngredients((ingredients) => [
      ...ingredients,
      { id: createIngredientId(), name, amount, isOptimistic: true },
    ]);
  };
  return { renderedIngredients, addIngredient };
}

function createIngredientId() {
  return `${Math.round(Math.random() * 1_000_000)}`;
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
