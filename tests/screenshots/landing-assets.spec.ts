import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const outputDirectory = path.resolve(process.env.ZPLR_SCREENSHOT_DIR ?? ".screenshots/current");
const runId = process.env.ZPLR_SCREENSHOT_RUN_ID;
const expectedCommit = process.env.ZPLR_COMMIT_SHA ?? process.env.GITHUB_SHA ?? currentCommit();
const colorSchemes = ["light", "dark"] as const;

type ColorScheme = typeof colorSchemes[number];

function currentCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function prepareEditor(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function openEditor(page: Page, colorScheme: ColorScheme): Promise<void> {
  await page.emulateMedia({ colorScheme });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/editor", { waitUntil: "domcontentloaded" });
  await waitForEditorReady(page, colorScheme);
  await page.locator(".designer-viewport").click({ position: { x: 5, y: 5 } });
  await expect(page.locator(".designer-field.selected")).toHaveCount(0);
}

async function reloadEditor(page: Page, colorScheme: ColorScheme): Promise<void> {
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForEditorReady(page, colorScheme);
}

async function waitForEditorReady(page: Page, colorScheme: ColorScheme): Promise<void> {
  await expect(page.getByTestId("editor-workspace")).toBeVisible();
  await expect(page.getByTestId("zpl-editor")).toBeVisible();
  const monaco = page.locator(".monaco-editor").first();
  await expect(monaco).toBeVisible();
  if (colorScheme === "dark") await expect(monaco).toHaveClass(/vs-dark/);
  else await expect(monaco).not.toHaveClass(/vs-dark/);
  await expect(page.locator(".monaco-editor .view-lines")).toBeVisible();
  await expect(page.getByTestId("visual-label-canvas")).toBeVisible();
  await expect(
    page.getByLabel("Open editor tabs").getByRole("button", { name: "shipping-label.zpl", exact: true }),
  ).toBeVisible();
  const renderedLabel = page.getByAltText("Editable rendered ZPL label");
  await expect(renderedLabel).toBeVisible();
  await expect.poll(() =>
    renderedLabel.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  ).toBe(true);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition: none !important;
      }
      /* Sticky scroll updates asynchronously after a source reveal and would
         otherwise make identical captures alternate between two states. */
      .monaco-editor .sticky-widget {
        display: none !important;
      }
    `,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
}

function screenshotFilename(name: string, colorScheme: ColorScheme): string {
  return `${name}${colorScheme === "dark" ? "-dark" : ""}.png`;
}

async function capture(page: Page, filename: string): Promise<void> {
  await page.screenshot({
    path: path.join(outputDirectory, filename),
    animations: "disabled",
    caret: "hide",
    fullPage: false,
    type: "png",
  });
}

test("captures current editor assets and records their provenance", async ({ page }) => {
  expect(runId, "ZPLR_SCREENSHOT_RUN_ID must be provided by the web build").toBeTruthy();
  await mkdir(outputDirectory, { recursive: true });

  await prepareEditor(page);
  for (const colorScheme of colorSchemes) {
    await openEditor(page, colorScheme);
    await capture(page, screenshotFilename("zpl-editor-overview", colorScheme));

    const layers = page.getByTestId("visual-layers");
    if (!await layers.isVisible()) {
      await page.getByRole("button", { name: "Open layers panel", exact: true }).click();
    }
    await expect(layers).toBeVisible();
    await layers.locator("button").first().click();
    await page.getByRole("tab", { name: "Properties", exact: true }).click();
    await expect(page.getByRole("tabpanel", { name: "Properties", exact: true })).toBeVisible();
    await capture(page, screenshotFilename("zpl-visual-designer", colorScheme));

    await reloadEditor(page, colorScheme);
    await page.getByTitle("Variable data and batch preview").click();
    const dataDialog = page.getByRole("dialog", { name: "Variable data", exact: true });
    await expect(dataDialog).toBeVisible();
    await dataDialog.locator(".data-welcome").getByRole("button", { name: "New dataset", exact: true }).click();
    await dataDialog.getByLabel("Dataset name").fill("Shipping batch");
    await dataDialog.getByLabel("Field 1 for Record 1", { exact: true }).fill("Ada Lovelace");
    await dataDialog.getByRole("button", { name: "Add column", exact: true }).click();
    await dataDialog.getByLabel("Column name for FN 2", { exact: true }).fill("Order");
    await dataDialog.getByLabel("Order for Record 1", { exact: true }).fill("ZPL-1042");
    await dataDialog.getByRole("button", { name: "Add record", exact: true }).click();
    await dataDialog.getByLabel("Field 1 for Record 2", { exact: true }).fill("Grace Hopper");
    await dataDialog.getByLabel("Order for Record 2", { exact: true }).fill("ZPL-1043");
    await expect(dataDialog.getByRole("button", { name: "Batch PNGs", exact: true })).toBeEnabled();
    await capture(page, screenshotFilename("zpl-variable-data", colorScheme));

    await page.setViewportSize({ width: 1200, height: 630 });
    await reloadEditor(page, colorScheme);
    await capture(page, screenshotFilename("zpl-editor-social", colorScheme));
  }

  const dimensions: Record<string, { width: number; height: number; colorScheme: ColorScheme }> = {};
  for (const colorScheme of colorSchemes) {
    dimensions[screenshotFilename("zpl-editor-overview", colorScheme)] = { width: 1440, height: 900, colorScheme };
    dimensions[screenshotFilename("zpl-visual-designer", colorScheme)] = { width: 1440, height: 900, colorScheme };
    dimensions[screenshotFilename("zpl-variable-data", colorScheme)] = { width: 1440, height: 900, colorScheme };
    dimensions[screenshotFilename("zpl-editor-social", colorScheme)] = { width: 1200, height: 630, colorScheme };
  }
  const files: Record<string, { width: number; height: number; colorScheme: ColorScheme; sha256: string; bytes: number }> = {};
  for (const [filename, size] of Object.entries(dimensions)) {
    const bytes = await readFile(path.join(outputDirectory, filename));
    expect(bytes.byteLength).toBeGreaterThan(10_000);
    files[filename] = {
      ...size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.byteLength,
    };
  }

  await writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify({
    version: 1,
    source: "captured",
    runId,
    commit: expectedCommit,
    capturedAt: new Date().toISOString(),
    files,
  }, null, 2)}\n`);
});
