import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("renders locally and exposes release metadata", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ZPLr", exact: true })).toBeVisible();
  await expect(page.getByTestId("local-only-notice")).toContainText("never leave this browser");
  await expect(page.getByAltText("Rendered shipping label preview")).toBeVisible({
    timeout: 30_000,
  });

  const versionResponse = await request.get("/version.json");
  expect(versionResponse.ok()).toBe(true);
  const version = await versionResponse.json();
  expect(version).toMatchObject({ name: "zplr", api: "0.3.0", profile: "zpl-ii-2025" });
  await expect(page.getByText("Rendering", { exact: true })).toBeVisible();
  await expect(page.getByText("Local-only", { exact: true })).toBeVisible();
});

test("lazy playground renders samples and source-linked diagnostics", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open live playground", exact: true }).click();
  await expect(page.getByRole("button", { name: "Close playground" })).toBeVisible();
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("ZPL source editor")).toBeAttached();
  await expect(page.getByAltText("Rendered ZPL label")).toBeVisible();

  await page.getByTestId("sample-select").selectOption("retail");
  await expect(page.getByAltText("Rendered ZPL label")).toBeVisible();
  await expect(page.getByText("No problems")).toBeVisible();

  const editorSurface = page
    .getByTestId("zpl-editor")
    .locator(".monaco-editor .view-lines");
  await expect(editorSurface).toBeVisible();
  await editorSurface.click({ position: { x: 12, y: 12 } });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.insertText("^XA^PW64^LL32^QZbad^XZ");
  const diagnostic = page.getByRole("button", { name: /UNKNOWN_COMMAND/ });
  await expect(diagnostic).toBeVisible();
  await diagnostic.click();
  await expect(
    page.locator(".monaco-editor .highlighted-command-inline")
  ).toHaveCount(1);
});

test("has no serious automated accessibility violations", async ({ page }) => {
  await page.goto("/");
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);

  const playgroundTrigger = page.getByRole("button", { name: "Open live playground", exact: true });
  await playgroundTrigger.click();
  const closeButton = page.getByRole("button", { name: "Close playground" });
  await expect(closeButton).toBeVisible();
  await expect(page.getByTestId("playground-panel")).toHaveCSS("opacity", "1");
  results = await new AxeBuilder({ page })
    .exclude(".monaco-editor")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  await closeButton.click();
  await expect(closeButton).toBeHidden();
  await expect(playgroundTrigger).toBeFocused();
});

test("remains usable at a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open live playground" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  await page.getByRole("button", { name: "Open live playground", exact: true }).click();
  await expect(page.getByRole("button", { name: "Close playground" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
