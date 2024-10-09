import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
      routes: (defineRoutes) =>
        //ver: https://remix.run/docs/en/main/file-conventions/vite-config#routes
        defineRoutes((route) => {
          // Sólo se incluye esta ruta si existe esta variable de entorno
          if (process.env.INCLUDE_TEST_ROUTES) {
            // Protegemos a los desarrolladores de que hagan cosas estúpidas como incluir rutas de prueba en producción
            if (process.env.NODE_ENV === "production") {
              console.warn(
                "You should not include test routes in production."
              );
              return;
            }
            route("__tests/login", "__test-routes__/login.tsx");
          }
        }),
    }),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
  },
});
