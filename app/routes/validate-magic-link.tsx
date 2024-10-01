import { json, redirect, type LoaderFunction } from "@remix-run/node";
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

  if (!user) {
    throw invalidMagicLink("user not found");
  }

  session.set("userId", user.id);
  return redirect("/app", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};
