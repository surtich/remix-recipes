import { json } from "@remix-run/react";
import Cryptr from "cryptr";
import { renderToStaticMarkup } from "react-dom/server"; // para usar esta función el fichero tiene que ser .tsx
import { sendEmail } from "./utils/email.server";

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

function isMagicLinkPayload(value: any): value is MagicLinkPayload {
  return (
    typeof value === "object" &&
    typeof value.email === "string" &&
    typeof value.nonce === "string" &&
    typeof value.createdAt === "string"
  );
}

export function invalidMagicLink(message: string) {
  return json({ error: message }, { status: 400 });
}

export function getMagicLinkPayload(request: Request): MagicLinkPayload {
  const url = new URL(request.url);
  const magic = url.searchParams.get("magic");

  if (!magic) {
    throw invalidMagicLink("magic search parameter is missing");
  }
  const magicLinkPayload = JSON.parse(cryptr.decrypt(magic));

  if (!isMagicLinkPayload(magicLinkPayload)) {
    throw invalidMagicLink("magic link is invalid");
  }
  return magicLinkPayload;
}

export function sendMagicLinkEmail(link: string, email: string) {
  if (process.env.NODE_ENV === "production") {
    const html = renderToStaticMarkup(
      <div>
        <h1>Log in to Remix Recipes</h1>
        <p>
          Hey there! Click the link bellow to finish logging in to the Remix
          Recipes app.
        </p>
        <a href={link}>Log In</a>
      </div>
    );
    return sendEmail({
      from: `Remix Recipes <${process.env.MAILGUN_FROM}>`,
      to: email,
      subject: "Log in to Remix Recipes",
      html,
    });
  } else {
    console.log("Magic link:", link);
  }
}
