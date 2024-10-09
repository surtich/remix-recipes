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
        defineRoutes((route) => {
          //ver: https://remix.run/docs/en/main/file-conventions/vite-config#routes
          route("__tests/login", "__test-routes__/login.tsx");
        }),
    }),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
  },
});
