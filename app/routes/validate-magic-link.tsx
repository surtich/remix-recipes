import {
  type ActionFunction,
  json,
  redirect,
  type LoaderFunction,
} from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import classNames from "classnames";
import { z } from "zod";
import { ErrorMessage, PrimaryButton, PrimaryInput } from "~/components/forms";
import { getMagicLinkPayload, invalidMagicLink } from "~/magic-links.server";
import { createUser, getUser } from "~/models/user.server";
import { commitSession, getSession } from "~/sessions";
import { validateForm } from "~/utils/validation";

const magicLinkMaxAge = 1000 * 60 * 10; // 10 minutes

export const loader: LoaderFunction = async ({ request }) => {
  const magicLinkPayload = getMagicLinkPayload(request);

  // 1. Validate expiration time
  const createdAt = new Date(magicLinkPayload.createdAt);
  const expiresAt = createdAt.getTime() + magicLinkMaxAge;

  if (Date.now() > expiresAt) {
    throw invalidMagicLink("magic link has expired");
  }

  // 2. Validate nonce
  const cookieHeader = request.headers.get("cookie");
  const session = await getSession(cookieHeader);

  if (session.get("nonce") !== magicLinkPayload.nonce) {
    throw invalidMagicLink("invalid nonce");
  }

  // 3. Validate email
  const user = await getUser(magicLinkPayload.email);

  if (user) {
    session.set("userId", user.id);
    session.unset("nonce");
    return redirect("/app", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  return json("ok", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};

const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  return validateForm(
    formData,
    signUpSchema,
    async ({ firstName, lastName }) => {
      const magicLinkPayload = getMagicLinkPayload(request);

      const user = await createUser(
        magicLinkPayload.email,
        firstName,
        lastName
      );

      const cookie = request.headers.get("cookie");
      const session = await getSession(cookie);
      session.set("userId", user.id);
      session.unset("nonce");
      return redirect("/app", {
        headers: { "Set-Cookie": await commitSession(session) },
      });
    },
    (errors) =>
      json(
        {
          errors,
          firstName: formData.get("firstName"), // hemos decidido usar una etiqueta <form> en lugar de un componente <Form> de Remix. Esto quiere decir que la página se va a recargar. En caso de error queremos mostrar los valores que el usuario ha introducido, por eso los pasamos al objet de error.
          lastName: formData.get("lastName"),
        },
        { status: 400 }
      )
  );
};

export default function ValidateMagicLink() {
  const actionData = useActionData<typeof action>();
  return (
    <div className="text-center">
      <div className="mt-24">
        <h1 className="text-2xl my8">You&apos;re almost done!</h1>
        <h2>Type in your name bellow to complete the signup process.</h2>
        <form
          method="post"
          className={classNames(
            "flex flex-col px-8 mx-16 md:mx-auto",
            "border-2 border-gray-200 rounded-md p-8 mt-8 md:w-80"
          )}
        >
          <fieldset className="flex flex-col mb-8">
            <div className="text-left mb-4">
              <label htmlFor="firstName">First Name</label>
              <PrimaryInput
                id="firstName"
                name="firstName"
                autoComplete="off"
                defaultValue={actionData?.firstName}
              />
              <ErrorMessage>{actionData?.errors?.firstName}</ErrorMessage>
            </div>
            <div className="text-left">
              <label htmlFor="lastName">Last Name</label>
              <PrimaryInput
                id="lastName"
                name="lastName"
                autoComplete="off"
                defaultValue={actionData?.lastName}
              />
              <ErrorMessage>{actionData?.errors?.lastName}</ErrorMessage>
            </div>
          </fieldset>
          <PrimaryButton className="w-36 mx-auto">Sign Up</PrimaryButton>
        </form>
      </div>
    </div>
  );
}
