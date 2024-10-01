import { json } from "@remix-run/react";
import Cryptr from "cryptr";

if (!process.env.MAGIC_LINK_SECRET) {
  throw new Error("MAGIC_LINK_SECRET is not set");
}

const cryptr = new Cryptr(process.env.MAGIC_LINK_SECRET);

type MagicLinkPayload = {
  email: string;
  // nonce = noum + once Nombre de un solo uso.
  nonce: string;
  createdAt: string;
};

export function generateMagicLink(email: string, nonce: string) {
  const payload: MagicLinkPayload = {
    email,
    nonce,
    createdAt: new Date().toISOString(),
  };

  if (!process.env.ORIGIN) {
    throw new Error("ORIGIN is not set");
  }

  const encryptedPayload = cryptr.encrypt(JSON.stringify(payload));
  const url = new URL(process.env.ORIGIN);
  url.pathname = "/validate-magic-link";
  url.searchParams.set("magic", encryptedPayload);
  return url.toString();
}

export function getMagicLinkPayload(request: Request): MagicLinkPayload {
  const url = new URL(request.url);
  const magic = url.searchParams.get("magic");

  if (!magic) {
    throw json(
      { error: "magic search parameter does not exist" },
      { status: 400 }
    );
  }
  const magicLinkPayload = JSON.parse(cryptr.decrypt(magic));
  return magicLinkPayload;
}
