import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/pulse-complete/",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
  },
});
