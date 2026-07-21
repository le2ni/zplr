import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { execFileSync } from "node:child_process";
import packageJson from "./package.json";

function gitCommit(): string {
  const supplied =
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.VITE_COMMIT_SHA;
  if (supplied) return supplied;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const commit = gitCommit();
const versionManifest = `${JSON.stringify({
  name: packageJson.name,
  version: packageJson.version,
  commit,
  api: "0.3.0",
  profile: "zpl-ii-2025",
}, null, 2)}\n`;

export default defineConfig({
  define: {
    __ZPLR_VERSION__: JSON.stringify(packageJson.version),
    __ZPLR_COMMIT__: JSON.stringify(commit),
  },
  plugins: [
    vue(),
    {
      name: "zplr-version-manifest",
      configureServer(server) {
        server.middlewares.use("/version.json", (request, response, next) => {
          if (request.method !== "GET" && request.method !== "HEAD") {
            next();
            return;
          }
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(request.method === "HEAD" ? undefined : versionManifest);
        });
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: versionManifest,
        });
      },
    },
  ],
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
