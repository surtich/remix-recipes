import { json, useLoaderData } from "@remix-run/react";

export const loader = () => {
  return json({ message: "Hello from Settings!" });
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
