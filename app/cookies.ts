import { createCookie } from "@remix-run/node";

if (!process.env.AUTH_COOKIE_SECRET) {
  throw new Error("AUTH_COOKIE_SECRET is not set");
}

export const userIdCookie = createCookie("remix-recipes__userId", {
  // secrets es un array para que se pueda rotar la contraseña.
  // Para firmar la cookie, se usa el primer secreto y para verificar la firma, se todos los del array.
  secrets: [process.env.AUTH_COOKIE_SECRET],
  httpOnly: true,
  secure: true,
});
