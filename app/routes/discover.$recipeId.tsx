import { HeadersArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  DiscoverRecipeDetails,
  DiscoverRecipeHeader,
} from "~/components/discover";
import db from "~/db.server";
import { getCurrentUser } from "~/utils/auth.server";
import { hash } from "~/utils/cryptography.server";

export function header({ loaderHeaders }: HeadersArgs) {
  return {
    etag: loaderHeaders.get("x-page-etag"),
    "cache-control": `max-age=3600, stale-while-revalidate=${3600 * 24 * 7}`,
  };
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const recipe = await db.recipe.findUnique({
    where: { id: params.recipeId },
    include: {
      ingredients: {
        select: {
          id: true,
          name: true,
          amount: true,
        },
      },
    },
  });

  if (recipe === null) {
    throw json({ message: "Recipe not found" }, { status: 404 });
  }

  const etag = hash(JSON.stringify(recipe));

  if (etag === request.headers.get("if-none-match")) {
    return new Response(null, { status: 304 }); // not modified
  }

  const user = await getCurrentUser(request);
  const etagPage = `${hash(user?.id ?? "anonymous")}.${etag}`;

  return json(
    { recipe },
    {
      headers: {
        etag,
        "x-etag-page": etagPage, // custom header. El convenio es que empiece con x-
        "cache-control": "max-age=5, stale-while-revalidate=10",
      },
    }
  );
}

export default function DiscoverRecipe() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="md:h-[calc(100vh-1rem)] m-[-1rem] overflow-auto">
      <DiscoverRecipeHeader recipe={data.recipe} />
      <DiscoverRecipeDetails recipe={data.recipe} />
    </div>
  );
}
