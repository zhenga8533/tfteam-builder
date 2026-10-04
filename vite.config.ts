/// <reference types="vitest/config" />
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/** Routes without parameters, read from the generated route tree, e.g. "/tools/tier-list". */
async function staticRoutes(): Promise<string[]> {
  const tree = await readFile("src/routeTree.gen.ts", "utf8");
  const fullPaths = tree.slice(tree.indexOf("fullPaths:"), tree.indexOf("fileRoutesByTo:"));
  return [...fullPaths.matchAll(/'(\/[^'$]+)'/g)].map((match) => match[1]!);
}

/**
 * GitHub Pages has no SPA rewrites. A copy of the app shell at each static route answers those URLs with a 200,
 * which link-preview crawlers need for shared links like `/builder?team=…`; 404.html catches the rest (routes
 * with parameters) so they still resolve client-side.
 */
const spaFallback = (): Plugin => ({
  name: "spa-fallback",
  apply: "build",
  async closeBundle() {
    await copyFile("dist/index.html", "dist/404.html");
    for (const route of await staticRoutes()) {
      await mkdir(`dist${route}`, { recursive: true });
      await copyFile("dist/index.html", `dist${route}/index.html`);
    }
  },
});

export default defineConfig({
  base: "/tfteam/",
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
