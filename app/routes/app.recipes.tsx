import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import {
  Form,
  Link,
  NavLink,
  Outlet,
  useFetchers,
  useLoaderData,
  useLocation,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";
import classNames from "classnames";
import { DeleteButton, PrimaryButton, SearchBar } from "~/components/forms";
import { CalendarIcon, PlusIcon } from "~/components/icons";
import {
  RecipeCard,
  RecipeDetailWrapper,
  RecipeListWrapper,
  RecipePageWrapper,
} from "~/components/recipes";
import db from "~/db.server";
import { requiredLoggedInUser } from "~/utils/auth.server";
import { useBuildSearchParams } from "~/utils/misc";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requiredLoggedInUser(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const filter = url.searchParams.get("filter");

  // En esta sección del código accedemos directamente a la base de datos para obtener las recetas del usuario
  // En un proyecto real habría que decidir si se usan modelos o se accede directamente en la vista a la DB. Nunca se deberían mezclar ambas alternativas.
  const recipes = await db.recipe.findMany({
    where: {
      userId: user.id,
      name: {
        contains: q ?? "",
      },
      mealPlanMultiplier: filter === "mealPlanOnly" ? { not: null } : {},
    },
    select: {
      name: true,
      totalTime: true,
      mealPlanMultiplier: true,
      imageUrl: true,
      id: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return json({ recipes });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requiredLoggedInUser(request);
  const formData = await request.formData();

  switch (formData.get("_action")) {
    case "createRecipe": {
      const recipe = await db.recipe.create({
        data: {
          userId: user.id,
          name: "New Recipe",
          totalTime: "0 minutes",
          imageUrl: "https://via.placeholder.com/150?text=Remix+Recipes",
          instructions: "",
        },
      });

      const url = new URL(request.url);
      // Hacemos esto para cambiar la URL pero preservar los parámetros de búsqueda
      url.pathname = `/app/recipes/${recipe.id}`;

      return redirect(url.toString());
    }

    case "clearMealPlan": {
      await db.recipe.updateMany({
        where: {
          userId: user.id,
          mealPlanMultiplier: { not: null },
        },
        data: { mealPlanMultiplier: null },
      });
      return redirect("/app/recipes");
    }

    default: {
      return null;
    }
  }
}

export default function Recipes() {
  const data = useLoaderData<typeof loader>();
  const location = useLocation(); // es lo mismo que la URL actual. Ver: https://developer.mozilla.org/en-US/docs/Web/API/Location
  const navigation = useNavigation(); // location es la URL actual, navigation es la URL a la que se va a ir
  const fetchers = useFetchers(); // obtiene todos los fetchers d ela página actual
  const buildSearchParams = useBuildSearchParams();
  const [searchParams] = useSearchParams();
  const mealPlanOnlyFilterOn = searchParams.get("filter") === "mealPlanOnly";

  return (
    <RecipePageWrapper>
      <RecipeListWrapper>
        <div className="flex gap-4">
          <SearchBar placeholder="Search recipes..." className="flex-grow" />
          <Link // es más sencillo usar un Link que un Form ya que no se necesita enviar datos al servidor como era el caso del <SearchBar />
            to={buildSearchParams(
              "filter",
              mealPlanOnlyFilterOn ? "" : "mealPlanOnly"
            )}
            className={classNames(
              "flex flex-col justify-center border-2 border-primary rounded-md px-2",
              mealPlanOnlyFilterOn ? "text-white bg-primary" : "text-primary"
            )}
          >
            <CalendarIcon />
          </Link>
        </div>
        <Form method="post" className="mt-4">
          {mealPlanOnlyFilterOn ? (
            <DeleteButton
              name="_action"
              value="clearMealPlan"
              className="w-full"
            >
              Clear Plan
            </DeleteButton>
          ) : (
            <PrimaryButton
              name="_action"
              value="createRecipe"
              className="w-full"
            >
              <div className="flex w-full justify-center">
                <PlusIcon />
                <span className="ml-2">Create New Recipe</span>
              </div>
            </PrimaryButton>
          )}
        </Form>
        <ul>
          {data?.recipes.map((recipe) => {
            const loading = navigation.location?.pathname.endsWith(recipe.id);

            const optimisticData = new Map();

            for (const fetcher of fetchers) {
              if (fetcher.formAction?.includes(recipe.id)) {
                if (fetcher.formData?.get("_action") === "saveName") {
                  optimisticData.set("name", fetcher.formData?.get("name"));
                }
                if (fetcher.formData?.get("_action") === "saveTotalTime") {
                  optimisticData.set(
                    "totalTime",
                    fetcher.formData?.get("totalTime")
                  );
                }
              }
            }
            return (
              <li className="my-4" key={recipe.id}>
                <NavLink
                  prefetch="intent" // precarga el componente cuando el usuario pasa el mouse por encima o cuando el enlace tiene el foco.
                  to={{
                    pathname: recipe.id,
                    search:
                      location.search /*A string containing a '?' followed by the parameters or "query string" of the URL*/,
                  }}
                >
                  {({ isActive }) => (
                    <RecipeCard
                      name={optimisticData.get("name") ?? recipe.name}
                      totalTime={
                        optimisticData.get("totalTime") ?? recipe.totalTime
                      }
                      mealPlanMultiplier={recipe.mealPlanMultiplier}
                      imageUrl={recipe.imageUrl}
                      isActive={isActive}
                      isLoading={loading}
                    />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </RecipeListWrapper>
      <RecipeDetailWrapper>
        <Outlet />
      </RecipeDetailWrapper>
    </RecipePageWrapper>
  );
}
