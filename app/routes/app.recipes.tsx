import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { SearchBar } from "~/components/forms";
import {
  RecipeCard,
  RecipeDetailWrapper,
  RecipeListWrapper,
  RecipePageWrapper,
} from "~/components/recipes";
import db from "~/db.server";
import { requiredLoggedInUser } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requiredLoggedInUser(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  // En esta sección del código accedemos directamente a la base de datos para obtener las recetas del usuario
  // En un proyecto real habría que decidir se se usan modelos o se accede directamente en la vista a la DB. Nunca se deberían mezclar ambas alternativas.
  const recipes = await db.recipe.findMany({
    where: {
      userId: user.id,
      name: { contains: q ?? "", mode: "insensitive" },
    },
    select: { name: true, totalTime: true, imageUrl: true, id: true },
  });

  return json({ recipes });
}

export default function Recipes() {
  const data = useLoaderData<typeof loader>();

  return (
    <RecipePageWrapper>
      <RecipeListWrapper>
        <SearchBar placeholder="Search recipes..." />
        <ul>
          {data?.recipes.map((recipe) => (
            <li className="my-4" key={recipe.id}>
              <NavLink reloadDocument to={recipe.id}>
                {({ isActive }) => (
                  <RecipeCard
                    name={recipe.name}
                    totalTime={recipe.totalTime}
                    imageUrl={recipe.imageUrl}
                    isActive={isActive}
                  />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </RecipeListWrapper>
      <RecipeDetailWrapper>
        <Outlet />
      </RecipeDetailWrapper>
    </RecipePageWrapper>
  );
}
