import { ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  json,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";
import classNames from "classnames";
import { DeleteButton, PrimaryButton } from "~/components/forms";
import { PlusIcon, SearchIcon } from "~/components/icons";
import {
  createShelf,
  deleteShelf,
  getAllShelves,
} from "~/models/pantry-shelf.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const shelves = await getAllShelves(q);
  return json(shelves);
};

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
    default: {
      return null;
    }
  }
};

export default function Pantry() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();

  const isSearching = navigation.formData?.has("q"); // formData es un tipo de la API FormData (https://developer.mozilla.org/en-US/docs/Web/API/FormData)
  const isCreatingShelf = navigation.formData?.get("_action") === "createShelf";

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
      <Form method="post">
        <PrimaryButton
          name="_action"
          value="createShelf"
          className={classNames(
            "mt-4 w-full md:w-fit",
            isCreatingShelf ? "bg-primary-light " : ""
          )}
        >
          <PlusIcon />
          <span className="pl-2">
            {isCreatingShelf ? "Creating Shelf" : "Create Shelf"}
          </span>
        </PrimaryButton>
      </Form>
      <ul
        className={classNames(
          "flex gap-8 overflow-x-auto mt-4 pb-4",
          "snap-x snap-mandatory md:snap-none"
        )}
      >
        {data.map((shelf) => (
          <li
            key={shelf.id}
            className={classNames(
              "border-2 border-primary rounded-md p-4",
              "w-[calc(100vw-2rem)] flex-none snap-center h-fit",
              "md:w-96"
            )}
          >
            <h1 className="text-2xl font-extrabold mb-2">{shelf.name}</h1>
            <ul>
              {shelf.items.map((item) => (
                <li key={item.id} className="py-2">
                  {item.name}
                </li>
              ))}
            </ul>
            <Form method="post" className="pt-8">
              <input type="hidden" name="shelfId" value={shelf.id} />
              <DeleteButton
                name="_action"
                value="deleteShelf"
                className="w-full"
              >
                Delete Shelf
              </DeleteButton>
            </Form>
          </li>
        ))}
      </ul>
    </div>
  );
}
