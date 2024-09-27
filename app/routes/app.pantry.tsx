import { ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  json,
  useFetcher,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";
import classNames from "classnames";
import { z } from "zod";
import { DeleteButton, PrimaryButton } from "~/components/forms";
import { PlusIcon, SaveIcon, SearchIcon } from "~/components/icons";
import {
  createShelf,
  deleteShelf,
  getAllShelves,
  saveShelfName,
} from "~/models/pantry-shelf.server";
import { validateForm } from "~/utils/validation";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const shelves = await getAllShelves(q);
  return json(shelves);
};

const saveShelfNameSchema = z.object({
  shelfId: z.string(),
  shelfName: z.string().min(1),
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
      const shelfId = formData.get("shelfId");
      if (typeof shelfId !== "string") {
        return json({
          errors: { errors: { shelfId: "Shelf ID must be a string" } },
        });
      }
      return deleteShelf(shelfId);
    }
    case "saveShelfName": {
      return validateForm(
        formData,
        saveShelfNameSchema,
        (data) => saveShelfName(data.shelfId, data.shelfName),
        (errors) => json({ errors })
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

type ShelfProps = {
  shelf: {
    id: string;
    name: string;
    items: {
      id: string;
      name: string;
    }[];
  };
};

function Shelf({ shelf }: ShelfProps) {
  const deleteShelfFetcher = useFetcher();
  const saveShelfNameFetcher = useFetcher();
  const isDeletingShelf =
    deleteShelfFetcher.formData?.get("_action") === "deleteShelf" &&
    deleteShelfFetcher.formData?.get("shelfId") === shelf.id;

  return (
    <li
      key={shelf.id}
      className={classNames(
        "border-2 border-primary rounded-md p-4",
        "w-[calc(100vw-2rem)] flex-none snap-center h-fit",
        "md:w-96"
      )}
    >
      <saveShelfNameFetcher.Form method="post" reloadDocument className="flex">
        <input
          type="text"
          defaultValue={shelf.name}
          name="shelfName"
          placeholder="Shelf Name"
          autoComplete="off"
          className={classNames(
            "text-2xl font-extrabold mb-2 w-full outline-none",
            "border-b-2 border-b-background focus:border-b-primary"
          )}
        />
        <button name="_action" value="saveShelfName" className="ml-4">
          <SaveIcon />
        </button>
        <input type="hidden" name="shelfId" value={shelf.id} />
      </saveShelfNameFetcher.Form>
      <ul>
        {shelf.items.map((item) => (
          <li key={item.id} className="py-2">
            {item.name}
          </li>
        ))}
      </ul>
      <deleteShelfFetcher.Form method="post" className="pt-8">
        <input type="hidden" name="shelfId" value={shelf.id} />
        <DeleteButton
          name="_action"
          value="deleteShelf"
          className="w-full"
          isLoading={isDeletingShelf}
        >
          {isDeletingShelf ? "Deleting Shelf" : "Delete Shelf"}
        </DeleteButton>
      </deleteShelfFetcher.Form>
    </li>
  );
}
