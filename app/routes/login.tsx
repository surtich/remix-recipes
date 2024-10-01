import { type ActionFunction, json, LoaderFunction } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { ErrorMessage, PrimaryButton, PrimaryInput } from "~/components/forms";
import { generateMagicLink } from "~/magic-links.server";
import { commitSession, getSession } from "~/sessions";
import { validateForm } from "~/utils/validation";

const loginSchema = z.object({
  email: z.string().email(),
});

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get("cookie");
  const session = await getSession(cookieHeader);
  console.log("Session data:", session.data);
  return null;
};

export const action: ActionFunction = async ({ request }) => {
  const cookieHeader = request.headers.get("cookie");
  const session = await getSession(cookieHeader);
  const formData = await request.formData();

  return validateForm(
    formData,
    loginSchema,
    async ({ email }) => {
      const nonce = uuid();
      // se usa un set normal para evitar que la recarga de la página provoque la eliminación del nonce.
      // se controla manualmente el borrado del nonce para garantizar un sólo uso.
      session.set("nonce", nonce);
      const link = generateMagicLink(email, nonce);
      console.log("Magic link:", link);
      return json("ok", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    },
    (errors) => json({ errors, email: formData.get("email") }, { status: 400 })
  );
};

export default function Login() {
  const actionData = useActionData<typeof action>();
  return (
    <div className="text-center mt-36">
      <h1 className="text-3xl mb-8">Remix recipes</h1>
      <form method="post" className="mx-auto md:w-1/3">
        <div className="text-left pb-4">
          <PrimaryInput
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="off"
            defaultValue={actionData?.email}
          />
          <ErrorMessage>{actionData?.errors?.email}</ErrorMessage>
        </div>
        <PrimaryButton className="w-1/3 mx-auto">Log in</PrimaryButton>
      </form>
    </div>
  );
}
