import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH: subpasta onde o site fica publicado (o GitHub Pages usa /<nome-do-repo>/).
// Rodando no notebook, fica "/".
export default defineConfig({
  base: process.env.BASE_PATH ? `${process.env.BASE_PATH.replace(/\/$/, "")}/` : "/",
  plugins: [react()],
});
