// This preset already registers tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro
// (build only) and the @ path alias. Don't add those plugins again or they run twice.
// Extra Vite options go in defineConfig({ vite: { ... } }).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
