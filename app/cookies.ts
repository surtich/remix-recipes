import { createCookie } from "@remix-run/node";

if (!process.env.AUTH_COOKIE_SECRET) {
  throw new Error("AUTH_COOKIE_SECRET is not set");
}

export const sessionCookie = createCookie("remix-recipes__session", {
  // secrets es un array para que se pueda rotar la contraseña.
  // Para firmar la cookie, se usa el primer secreto y para verificar la firma, se todos los del array.
  secrets: [process.env.AUTH_COOKIE_SECRET],
  httpOnly: true,
  secure: true,
});

// No debemos usar la cookie de sesión porque se destruye cuando el usuario se
// desconecta y queremos mantener la información de las preferencias del usuario
// incluso si no está conectado.
export const themeCookie = createCookie("remix-recipes__theme");
