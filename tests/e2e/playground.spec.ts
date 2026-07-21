import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("renders locally and links to the dedicated editor route", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ZPLr", exact: true })).toBeVisible();
  await expect(page.getByTestId("local-only-notice")).toContainText("never leave this browser");
  await expect(page.getByAltText("Rendered shipping label preview")).toBeVisible({ timeout: 30_000 });

  const editorLink = page.getByRole("link", { name: "Open ZPL editor", exact: true });
  await expect(editorLink).toHaveAttribute("href", "/editor");

  const versionResponse = await request.get("/version.json");
  expect(versionResponse.ok()).toBe(true);
  const version = await versionResponse.json();
  expect(version).toMatchObject({ name: "zplr", api: "0.3.0", profile: "zpl-ii-2025" });
  await expect(page.getByText("Rendering", { exact: true })).toBeVisible();
  await expect(page.getByText("Local-only", { exact: true })).toBeVisible();

  await editorLink.click();
  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.getByRole("heading", { name: "ZPL Editor" })).toBeVisible();
});

test("opens directly as a full IDE and links diagnostics to source", async ({ page }) => {
  await page.goto("/editor");
  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.getByRole("heading", { name: "ZPL Editor" })).toBeVisible();
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("ZPL source editor")).toBeAttached();
  await expect(page.getByAltText("Rendered ZPL label")).toBeVisible();
  await expect(page.getByText("ZPL II 2025", { exact: true })).toBeVisible();
  await expect(page.getByText("223 commands", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Retail UPC / EAN", exact: true }).click();
  await expect(page.getByAltText("Rendered ZPL label")).toBeVisible();
  await expect(page.getByText("No problems detected")).toBeVisible();

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await expect(editorSurface).toBeVisible();
  await editorSurface.click({ position: { x: 12, y: 12 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("^XA^PW64^LL32^QZbad^XZ");
  const diagnostic = page.getByRole("button", { name: /UNKNOWN_COMMAND/i });
  await expect(diagnostic).toBeVisible();
  await diagnostic.click();
  await expect(page.locator(".monaco-editor .highlighted-command-inline")).toHaveCount(1);
  await expect(page.locator(".monaco-editor .squiggly-warning, .monaco-editor .squiggly-error")).not.toHaveCount(0);
});

test("keeps multiple files, dirty state, and editor models independent", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });

  const tabs = page.getByLabel("Open editor tabs");
  await page.getByRole("button", { name: "New", exact: true }).click();
  await expect(tabs.getByRole("button", { name: "untitled.zpl", exact: true })).toBeVisible();
  await expect(tabs.getByRole("button", { name: "shipping-label.zpl", exact: true })).toBeVisible();

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 80, y: 40 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("^XA^PW320^LL180^FO20,20^A0N,30,30^FDSecond file^FS^XZ");
  await expect(tabs.getByRole("button", { name: "untitled.zpl Edited", exact: true })).toBeVisible();

  await tabs.getByRole("button", { name: "shipping-label.zpl", exact: true }).click();
  await expect(page.getByText("workspace / shipping-label.zpl", { exact: true })).toBeVisible();
  await tabs.getByRole("button", { name: "untitled.zpl Edited", exact: true }).click();
  await expect(page.getByText("workspace / untitled.zpl", { exact: true })).toBeVisible();
  await expect(editorSurface).toContainText("Second file");
});

test("offers quick fixes and configurable live preview", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 80, y: 40 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("^XA^F010,20^FDQuick fix^FS^XZ");
  const diagnostic = page.getByRole("button", { name: /UNKNOWN_COMMAND/i });
  await expect(diagnostic).toBeVisible();
  await diagnostic.click();
  await page.keyboard.press("Alt+Enter");
  await expect(page.locator(".actionList")).toBeVisible();
  await expect(page.locator(".actionList")).toContainText("Change to ^FO");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Printer and preview settings", exact: true }).click();
  await page.getByRole("combobox", { name: "Label size", exact: true }).selectOption("custom");
  await page.getByRole("spinbutton", { name: "Width (dots)", exact: true }).fill("320");
  await page.getByRole("spinbutton", { name: "Height (dots)", exact: true }).fill("180");
  await expect(page.getByText("320 × 180 dots · 203 dpi", { exact: true })).toBeVisible();

  await page.getByRole("checkbox", { name: "Render automatically while typing", exact: true }).uncheck();
  await page.getByRole("spinbutton", { name: "Width (dots)", exact: true }).fill("360");
  await expect(page.getByRole("button", { name: "Render updated source", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Render updated source", exact: true }).click();
  await expect(page.getByText("360 × 180 dots · 203 dpi", { exact: true })).toBeVisible();
});

test("offers command-aware completion, snippets, and formatting", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 100, y: 100 } });
  await page.keyboard.type("^F");
  await page.getByRole("button", { name: "Show ZPL completions" }).click();
  await expect(page.locator(".suggest-widget")).toBeVisible();
  await expect(page.locator(".suggest-widget .monaco-list-row").filter({ hasText: "^FD" }).first()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Commands", exact: true }).click();
  const commandSearch = page.getByLabel("Search all ZPL commands");
  await commandSearch.fill("code 128");
  await expect(page.getByRole("button", { name: /\^BC.*Code 128 Bar Code/ })).toBeVisible();
  await page.getByRole("button", { name: /\^BC.*Code 128 Bar Code/ }).click();

  await page.getByRole("button", { name: "Format", exact: true }).click();
  await expect(page.getByAltText("Rendered ZPL label")).toBeVisible();
});

test("has no serious automated accessibility violations", async ({ page }) => {
  await page.goto("/");
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);

  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  results = await new AxeBuilder({ page })
    .exclude(".monaco-editor")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("remains usable at a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open ZPL editor" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  await page.goto("/editor");
  await expect(page.getByRole("button", { name: "Source", exact: true })).toBeVisible();
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  await page.getByRole("button", { name: /Preview/ }).click();
  await expect(page.getByAltText("Rendered ZPL label")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
