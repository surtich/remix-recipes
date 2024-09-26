import { json, useLoaderData, useRouteError } from "@remix-run/react";

export const loader = () => {
  return json({ message: "Hello from Profile!" });
};

export default function Profile() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>appProfile</h1>
      <p>{data.message}</p>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  // En JavaScript un error puede ser de cualquier tipo incluso un string, por eso se hace la comprobación con instanceof Error.
  if (error instanceof Error) {
    return (
      <div className="bg-red-300 border-2 border-red-600 rounded-md p-4">
        <h1>Whoops, something went wrong.</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return <div>An unexpected error ocurred!</div>;
}
