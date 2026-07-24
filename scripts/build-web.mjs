import { randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDirectory = path.join(repositoryRoot, ".screenshots", "current");
const runId = randomUUID();
const commit = suppliedCommit() ?? gitCommit();
const environment = {
  ...process.env,
  ZPLR_COMMIT_SHA: commit,
  ZPLR_SCREENSHOT_DIR: screenshotDirectory,
  ZPLR_SCREENSHOT_RUN_ID: runId,
};

function suppliedCommit() {
  return process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? process.env.ZPLR_COMMIT_SHA;
}

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: environment,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function ensureChromium() {
  try {
    await launchChromium();
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/executable doesn't exist|download new browsers/i.test(message)) throw error;
  }
  console.log("Playwright Chromium is missing; installing the pinned browser binary for screenshot capture.");
  run("pnpm", ["exec", "playwright", "install", "chromium"]);
  await launchChromium();
}

async function launchChromium() {
  const browser = await chromium.launch({ headless: true });
  await browser.close();
}

await rm(screenshotDirectory, { recursive: true, force: true });
run("pnpm", ["run", "typecheck:web"]);
await ensureChromium();
run("pnpm", ["exec", "nuxt", "generate"]);
run("pnpm", ["exec", "playwright", "test", "--config=playwright.screenshots.config.ts"]);
run("node", ["scripts/finalize-web-build.mjs"]);
