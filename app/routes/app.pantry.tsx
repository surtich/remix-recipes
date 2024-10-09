import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  isRouteErrorResponse,
  json,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import classNames from "classnames";
import { useRef, useState } from "react";
import { z } from "zod";
import {
  DeleteButton,
  ErrorMessage,
  Input,
  PrimaryButton,
  SearchBar,
} from "~/components/forms";
import { PlusIcon, SaveIcon, TrashIcon } from "~/components/icons";
import {
  createShelfItem,
  deleteShelfItem,
  getShelfItem,
} from "~/models/pantry-items.server";
import {
  createShelf,
  deleteShelf,
  getAllShelves,
  getShelf,
  saveShelfName,
} from "~/models/pantry-shelf.server";
import { requiredLoggedInUser } from "~/utils/auth.server";
import { useIsHydrated, useServerLayoutEffect } from "~/utils/misc";
import { validateForm } from "~/utils/validation";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requiredLoggedInUser(request);

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const shelves = await getAllShelves(user.id, q);
  return json(shelves);
};

const deleteShelfSchema = z.object({
  shelfId: z.string(),
});

const saveShelfNameSchema = z.object({
  shelfId: z.string(),
  shelfName: z.string().min(1, "Shelf name cannot be blank"),
});

const createShelfItemSchema = z.object({
  shelfId: z.string(),
  itemName: z.string().min(1, "Item name cannot be blank"),
});

const deleteShelfItemSchema = z.object({
  itemId: z.string(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requiredLoggedInUser(request);

  const formData = await request.formData();
  switch (
    //get recibe la propiedad name y devuelve la propiedad value
    formData.get("_action")
  ) {
    case "createShelf": {
      return createShelf(user.id);
    }
    case "deleteShelf": {
      return validateForm(
        formData,
        deleteShelfSchema,
        async (data) => {
          const shelf = await getShelf(data.shelfId);
          if (shelf !== null && shelf.userId !== user.id) {
            throw json(
              {
                errors: {
                  shelfId: "You do not have permission to delete this shelf",
                },
              },
              { status: 401 }
            );
          }
          return deleteShelf(data.shelfId);
        },
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "saveShelfName": {
      return validateForm(
        formData,
        saveShelfNameSchema,
        async (data) => {
          const shelf = await getShelf(data.shelfId);
          if (shelf !== null && shelf.userId !== user.id) {
            throw json(
              {
                errors: {
                  shelfId:
                    "You do not have permission to change the shelf's name",
                },
              },
              { status: 401 }
            );
          }
          return saveShelfName(data.shelfId, data.shelfName);
        },
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "createShelfItem": {
      return validateForm(
        formData,
        createShelfItemSchema,
        (data) => createShelfItem(user.id, data.shelfId, data.itemName),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "deleteShelfItem": {
      return validateForm(
        formData,
        deleteShelfItemSchema,
        async (data) => {
          const item = await getShelfItem(data.itemId);
          if (item !== null && item.userId !== user.id) {
            throw json(
              {
                errors: {
                  itemId: "You do not have permission to delete this item",
                },
              },
              { status: 401 }
            );
          }
          return deleteShelfItem(data.itemId);
        },
        (errors) => json({ errors }, { status: 400 })
      );
    }
    default: {
      return null;
    }
  }
};

export default function Pantry() {
  const data = useLoaderData<typeof loader>();
  const createShelfFetcher = useFetcher();

  const isCreatingShelf =
    createShelfFetcher.formData?.get("_action") === "createShelf";

  return (
    <div>
      <SearchBar placeholder="Search Shelves..." className="md:w-80 " />
      <createShelfFetcher.Form method="post">
        <PrimaryButton
          name="_action"
          value="createShelf"
          className="mt-4 w-full md:w-fit"
          isLoading={isCreatingShelf}
        >
          <PlusIcon />
          <span className="pl-2">
            {isCreatingShelf ? "Creating Shelf" : "Create Shelf"}
          </span>
        </PrimaryButton>
      </createShelfFetcher.Form>
      <ul
        className={classNames(
          "flex gap-8 overflow-x-auto mt-4 pb-4",
          "snap-x snap-mandatory md:snap-none"
        )}
      >
        {data.map((shelf) => {
          return <Shelf key={shelf.id} shelf={shelf} />;
        })}
      </ul>
    </div>
  );
}

type ShelfItem = {
  id: string;
  name: string;
  isOptimistic?: boolean;
};

type ShelfProps = {
  shelf: RenderedItem;
};

function Shelf({ shelf }: ShelfProps) {
  // useFetcher() can only be called at a component level that's why we extract the code to its own component
  const deleteShelfFetcher = useFetcher();
  const saveShelfNameFetcher = useFetcher();
  const createShelfItemFetcher = useFetcher();
  const createItemFormRef = useRef<HTMLFormElement>(null);
  const { renderedItems, addItem } = useOptimisticItems(
    shelf.items,
    createShelfItemFetcher.state
  );
  const isHydrated = useIsHydrated();
  const isDeletingShelf =
    deleteShelfFetcher.formData?.get("_action") === "deleteShelf" &&
    deleteShelfFetcher.formData?.get("shelfId") === shelf.id;

  return isDeletingShelf ? null : (
    <li
      key={shelf.id}
      className={classNames(
        "border-2 border-primary rounded-md p-4",
        "w-[calc(100vw-2rem)] flex-none snap-center h-fit",
        "md:w-96"
      )}
    >
      <saveShelfNameFetcher.Form method="post" className="flex">
        <div className="w-full mb-2 peer">
          <Input
            type="text"
            required
            defaultValue={shelf.name}
            name="shelfName"
            placeholder="Shelf Name"
            aria-label="Shelf Name"
            autoComplete="off"
            className="text-2xl font-extrabold"
            error={!!saveShelfNameFetcher.data?.errors?.shelfName}
            onChange={(event) =>
              event.target.value &&
              saveShelfNameFetcher.submit(
                {
                  _action: "saveShelfName",
                  shelfId: shelf.id,
                  shelfName: event.target.value,
                },
                { method: "post" }
              )
            }
          />
          <ErrorMessage>
            {saveShelfNameFetcher.data?.errors?.shelfName}
          </ErrorMessage>
        </div>
        {isHydrated ? null : (
          <button
            name="_action"
            value="saveShelfName"
            className={classNames(
              "ml-4 opacity-0 hover:opacity-100 focus:opacity-100",
              "peer-focus-within:opacity-100"
            )}
          >
            <SaveIcon />
          </button>
        )}
        <input type="hidden" name="shelfId" value={shelf.id} />
        <ErrorMessage className="pb-2">
          {saveShelfNameFetcher.data?.errors?.shelfId}
        </ErrorMessage>
      </saveShelfNameFetcher.Form>

      <createShelfItemFetcher.Form
        method="post"
        className="flex py-2"
        ref={createItemFormRef}
        onSubmit={(event) => {
          const target = event.target as HTMLFormElement;
          const itemNameInput = target.elements.namedItem(
            "itemName"
          ) as HTMLInputElement;
          addItem(itemNameInput.value);
          event.preventDefault();
          createShelfItemFetcher.submit(
            {
              itemName: itemNameInput.value,
              shelfId: shelf.id,
              _action: "createShelfItem",
            },
            { method: "post" }
          );
          createItemFormRef.current?.reset();
        }}
      >
        <div className="w-full mb-2 peer">
          <input
            type="text"
            required
            name="itemName"
            placeholder="New Item"
            autoComplete="off"
            className={classNames(
              "w-full outline-none",
              "border-b-2 border-b-background focus:border-b-primary",
              createShelfItemFetcher.data?.errors?.itemName
                ? "border-b-red-600"
                : ""
            )}
          />
          <ErrorMessage>
            {createShelfItemFetcher.data?.errors?.itemName}
          </ErrorMessage>
        </div>
        <button
          name="_action"
          value="createShelfItem"
          className={classNames(
            "ml-4",
            "ml-4 opacity-0 hover:opacity-100 focus:opacity-100",
            "peer-focus-within:opacity-100"
          )}
        >
          <SaveIcon />
        </button>
        <input type="hidden" name="shelfId" value={shelf.id} />
        <ErrorMessage className="pb-2">
          {createShelfItemFetcher.data?.errors?.shelfId}
        </ErrorMessage>
      </createShelfItemFetcher.Form>

      <ul>
        {renderedItems.map((item) => (
          <ShelfItem key={item.id} shelfItem={item} />
        ))}
      </ul>
      <deleteShelfFetcher.Form
        method="post"
        className="pt-8"
        onSubmit={(event) => {
          if (!confirm("Are you sure you want to delete this shelf?")) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="shelfId" value={shelf.id} />
        <ErrorMessage className="pb-2">
          {deleteShelfFetcher.data?.errors?.shelfId}
        </ErrorMessage>
        <DeleteButton name="_action" value="deleteShelf" className="w-full">
          Delete Shelf
        </DeleteButton>
      </deleteShelfFetcher.Form>
    </li>
  );
}

type ShelfItemProps = {
  shelfItem: ShelfItem;
};

function ShelfItem({ shelfItem }: ShelfItemProps) {
  const deleteShelfItemFetcher = useFetcher();
  const isDeletingItem = !!deleteShelfItemFetcher.formData; // !! truco para convertir un valor en booleano

  return isDeletingItem ? null : (
    <li className="py-2">
      <deleteShelfItemFetcher.Form method="post" className="flex">
        <p className="w-full">{shelfItem.name}</p>
        {shelfItem.isOptimistic ? null : (
          <button
            name="_action"
            value="deleteShelfItem"
            aria-label={`delete ${shelfItem.name}`}
          >
            <TrashIcon />
          </button>
        )}
        <input type="hidden" name="itemId" value={shelfItem.id} />
        <ErrorMessage>
          {deleteShelfItemFetcher.data?.errors?.itemId}
        </ErrorMessage>
      </deleteShelfItemFetcher.Form>
    </li>
  );
}

type RenderedItem = {
  id: string;
  name: string;
  isOptimistic?: boolean;
};

function useOptimisticItems(
  savedItems: Array<RenderedItem>,
  createShelfItemState: "idle" | "submitting" | "loading"
) {
  const [optimisticItems, setOptimisticItems] = useState<Array<RenderedItem>>(
    []
  );

  const renderedItems = [...optimisticItems, ...savedItems];

  renderedItems.sort((a, b) => {
    if (a.name === b.name) {
      return 0;
    }
    return a.name < b.name ? -1 : 1;
  });

  useServerLayoutEffect(() => {
    // este estado se alcanza cuando el fetcher ha finalizado la revalidación
    if (createShelfItemState === "idle") {
      setOptimisticItems([]);
    }
  }, [createShelfItemState]);

  const addItem = (name: string) => {
    setOptimisticItems((items) => [
      ...items,
      { id: createItemId(), name, isOptimistic: true },
    ]);
  };
  return { renderedItems, addItem };
}

function createItemId() {
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
