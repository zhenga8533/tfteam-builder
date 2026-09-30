/// <reference types="vitest/config" />
import { copyFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// GitHub Pages has no SPA rewrites; serving the app shell as 404.html lets deep links resolve client-side.
const spaFallback = (): Plugin => ({
  name: "spa-fallback",
  apply: "build",
  async closeBundle() {
    await copyFile("dist/index.html", "dist/404.html");
  },
});

export default defineConfig({
  base: "/tfteam-builder/",
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
