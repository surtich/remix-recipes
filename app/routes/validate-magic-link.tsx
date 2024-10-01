import { json, redirect, type LoaderFunction } from "@remix-run/node";
import classNames from "classnames";
import { ErrorMessage, PrimaryButton, PrimaryInput } from "~/components/forms";
import { getMagicLinkPayload, invalidMagicLink } from "~/magic-links.server";
import { getUser } from "~/models/user.server";
import { commitSession, getSession } from "~/sessions";

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
    return redirect("/app", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  return json("ok", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};

export default function ValidateMagicLink() {
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
              />
              <ErrorMessage></ErrorMessage>
            </div>
            <div className="text-left">
              <label htmlFor="lastName">Last Name</label>
              <PrimaryInput id="lastName" name="lastName" autoComplete="off" />
              <ErrorMessage></ErrorMessage>
            </div>
          </fieldset>
          <PrimaryButton className="w-36 mx-auto">Sign Up</PrimaryButton>
        </form>
      </div>
    </div>
  );
}
