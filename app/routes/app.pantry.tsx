import { ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  json,
  useFetcher,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";
import classNames from "classnames";
import { useRef, useState } from "react";
import { z } from "zod";
import { DeleteButton, ErrorMessage, PrimaryButton } from "~/components/forms";
import { PlusIcon, SaveIcon, SearchIcon, TrashIcon } from "~/components/icons";
import { createShelfItem, deleteShelfItem } from "~/models/pantry-items.server";
import {
  createShelf,
  deleteShelf,
  getAllShelves,
  saveShelfName,
} from "~/models/pantry-shelf.server";
import { useServerLayoutEffect } from "~/utils/misc";
import { validateForm } from "~/utils/validation";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const shelves = await getAllShelves(q);
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
  const formData = await request.formData();
  switch (
    //get recibe la propiedad name y devuelve la propiedad value
    formData.get("_action")
  ) {
    case "createShelf": {
      return createShelf();
    }
    case "deleteShelf": {
      return validateForm(
        formData,
        deleteShelfSchema,
        (data) => deleteShelf(data.shelfId),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "saveShelfName": {
      return validateForm(
        formData,
        saveShelfNameSchema,
        (data) => saveShelfName(data.shelfId, data.shelfName),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "createShelfItem": {
      return validateForm(
        formData,
        createShelfItemSchema,
        (data) => createShelfItem(data.shelfId, data.itemName),
        (errors) => json({ errors }, { status: 400 })
      );
    }
    case "deleteShelfItem": {
      return validateForm(
        formData,
        deleteShelfItemSchema,
        (data) => deleteShelfItem(data.itemId),
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
  const [searchParams] = useSearchParams();
  const createShelfFetcher = useFetcher();

  const isSearching = createShelfFetcher.formData?.has("q"); // formData es un tipo de la API FormData (https://developer.mozilla.org/en-US/docs/Web/API/FormData)
  const isCreatingShelf =
    createShelfFetcher.formData?.get("_action") === "createShelf";

  return (
    <div>
      <Form
        className={classNames(
          "flex border-2 border-gray-300 rounded-md",
          "focus-within:border-primary md:w-80",
          isSearching ? "animate-pulse" : ""
        )}
      >
        <button className="px-2 mr-1">
          <SearchIcon />
        </button>
        <input
          type="text"
          name="q"
          defaultValue={searchParams.get("q") ?? ""}
          autoComplete="off"
          placeholder="Search Shelves..."
          className="w-full py-3 px-2 outline-none"
        />
      </Form>
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
        <div className="w-full mb-2">
          <input
            type="text"
            required
            defaultValue={shelf.name}
            name="shelfName"
            placeholder="Shelf Name"
            autoComplete="off"
            className={classNames(
              "text-2xl font-extrabold w-full outline-none",
              "border-b-2 border-b-background focus:border-b-primary",
              saveShelfNameFetcher.data?.errors?.shelfName
                ? "border-b-red-600"
                : ""
            )}
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
        <button name="_action" value="saveShelfName" className="ml-4">
          <SaveIcon />
        </button>
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
        <div className="w-full mb-2">
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
        <button name="_action" value="createShelfItem" className="ml-4">
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
      <deleteShelfFetcher.Form method="post" className="pt-8">
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
          <button name="_action" value="deleteShelfItem">
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
    console.log(">>>", createShelfItemState);
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
