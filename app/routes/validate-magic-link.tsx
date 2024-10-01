import { json, type LoaderFunction } from "@remix-run/node";
import { getMagicLinkPayload } from "~/magic-links.server";

export const loader: LoaderFunction = async ({ request }) => {
  const magicLinkPayload = getMagicLinkPayload(request);
  return json(magicLinkPayload);
};
