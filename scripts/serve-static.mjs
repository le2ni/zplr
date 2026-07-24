import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = path.join(repositoryRoot, ".output", "public");
const portArgument = process.argv.slice(2).find((argument) => /^\d+$/.test(argument));
const requestedPort = Number(portArgument ?? process.env.PORT ?? 4173);
const headerRules = process.argv.includes("--headers")
  ? parseHeaderRules(await readFile(path.join(publicDirectory, "_headers"), "utf8"))
  : [];
if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65_535) {
  throw new Error(`Invalid port: ${portArgument ?? process.env.PORT}`);
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const normalized = path.posix.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
    const relative = normalized.replace(/^\/+/, "");
    const candidates = relative
      ? [
          relative,
          path.extname(relative) ? undefined : `${relative}.html`,
          path.join(relative, "index.html"),
        ]
      : ["index.html"];
    let filename;
    let statusCode = 200;
    for (const candidate of candidates) {
      if (!candidate) continue;
      const resolved = path.resolve(publicDirectory, candidate);
      if (!resolved.startsWith(`${publicDirectory}${path.sep}`)) continue;
      if (await isFile(resolved)) {
        filename = resolved;
        break;
      }
    }
    if (!filename) {
      filename = path.join(publicDirectory, "404.html");
      statusCode = 404;
    }
    if (!await isFile(filename)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(statusCode, {
      "Cache-Control": "no-store",
      ...headersForPath(pathname),
      "Content-Type": contentTypes.get(path.extname(filename).toLowerCase()) ?? "application/octet-stream",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(filename).pipe(response);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Static preview failed");
  }
});

server.listen(requestedPort, "127.0.0.1", () => {
  console.log(`Static preview: http://127.0.0.1:${requestedPort}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

async function isFile(filename) {
  try {
    return (await stat(filename)).isFile();
  } catch {
    return false;
  }
}

function parseHeaderRules(source) {
  const rules = [];
  let currentRule;
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      currentRule = { pattern: line.trim(), headers: {} };
      rules.push(currentRule);
      continue;
    }
    const separator = line.indexOf(":");
    if (!currentRule || separator < 1) throw new Error(`Invalid _headers line: ${line}`);
    currentRule.headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return rules;
}

function headersForPath(pathname) {
  const headers = {};
  for (const rule of headerRules) {
    const matches = rule.pattern.endsWith("*")
      ? pathname.startsWith(rule.pattern.slice(0, -1))
      : pathname === rule.pattern;
    if (matches) Object.assign(headers, rule.headers);
  }
  return headers;
}
