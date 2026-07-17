import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// base: "./" makes asset paths relative, which is required for two things:
// serving under a GitHub Pages project subpath, and opening the built
// index.html directly from disk (file://). viteSingleFile then inlines all
// JS/CSS into that one index.html so it works offline with no server.
export default defineConfig({
  base: "./",
  plugins: [preact(), viteSingleFile()],
});
