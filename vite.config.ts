import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  build: {
    // Keep the playground artifact separate from the publishable library.
    outDir: "dist-playground",
    // The playground intentionally embeds the renderer and deterministic fonts.
    chunkSizeWarningLimit: 2_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
