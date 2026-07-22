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
  await expect(page.getByText("ZPL II", { exact: true })).toBeVisible();
  await expect(page.getByText("223 commands · 630 parameters", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Retail UPC / EAN", exact: true }).click();
  await expect(page.getByAltText("Rendered ZPL label")).toBeVisible();
  await expect(page.getByText("No problems detected")).toBeVisible();

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await expect(editorSurface).toBeVisible();
  await editorSurface.click({ position: { x: 12, y: 12 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("^XA^PW64^LL32^QZbad^XZ");
  await page.keyboard.press("Escape");
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

test("offers an optional WYSIWYG designer with visual source edits", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByRole("button", { name: "Designer", exact: true }).click();

  const canvas = page.getByTestId("visual-label-canvas");
  await expect(canvas).toBeVisible();
  await page.keyboard.press("Shift+/");
  const shortcuts = page.getByRole("dialog", { name: "Designer shortcuts", exact: true });
  await expect(shortcuts).toBeVisible();
  await expect(shortcuts).toContainText("Copy selected layer");
  await expect(shortcuts).toContainText("Paste copied layer");
  await page.keyboard.press("Escape");

  const textField = page.getByRole("button", { name: "Text at 40, 40", exact: true });
  await expect(textField).toBeVisible();
  await textField.click();
  await expect(page.getByRole("spinbutton", { name: "X dots", exact: true })).toHaveValue("40");

  await page.locator(".designer-viewport").click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole("tab", { name: "Layers", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("spinbutton", { name: "X dots", exact: true })).toBeHidden();
  await textField.click();

  const content = page.getByRole("textbox", { name: "Field content", exact: true });
  await content.fill("Visual label");
  await page.getByRole("button", { name: "Toggle grid", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Field content", exact: true })).toHaveValue("Visual label");

  await page.getByRole("button", { name: "Text at 40, 40", exact: true }).press("ArrowRight");
  await expect(page.getByRole("button", { name: "Text at 50, 40", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add box", exact: true }).click();
  const box = page.getByRole("button", { name: "Box at 360, 580", exact: true });
  await expect(box).toBeVisible();
  const boxWidth = page.getByRole("spinbutton", { name: "Box width (in dots)", exact: true });
  const boxHeight = page.getByRole("spinbutton", { name: "Box height (in dots)", exact: true });
  await expect(boxWidth).toHaveValue("200");
  await expect(boxHeight).toHaveValue("100");
  await expect(page.getByText("The ^GB command is used to draw boxes and lines as part of a label format.", { exact: true })).toBeVisible();
  const graphicBoxProperties = page.locator(".designer-command-properties").filter({ hasText: "Graphic Box" });
  await expect(graphicBoxProperties.getByRole("link", { name: "Open official documentation for Graphic Box", exact: true }))
    .toHaveAttribute("href", /docs\.zebra\.com/);
  const widthInfo = graphicBoxProperties.locator(".designer-property-help").first();
  await widthInfo.locator("summary").click();
  await expect(widthInfo).toContainText("Values: value of t to 32000");
  await boxWidth.fill("240");
  await boxWidth.press("Tab");
  await expect(boxWidth).toHaveValue("240");
  await boxHeight.fill("120");
  await boxHeight.press("Tab");
  await expect(boxHeight).toHaveValue("120");
  const bounds = await box.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 20, bounds!.y + bounds!.height / 2 + 10, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole("spinbutton", { name: "X dots", exact: true })).not.toHaveValue("360");

  await page.getByRole("button", { name: "Open layers panel", exact: true }).click();
  const layers = page.getByTestId("visual-layers");
  const layerNames = layers.locator(".designer-layer-row strong");
  await expect(layerNames).toHaveCount(2);
  await expect(layerNames.first()).toHaveText("Box");
  await layers.getByRole("button", { name: /Select Box layer/ }).click();
  await page.getByRole("button", { name: "Send backward", exact: true }).click();
  await expect(layerNames.first()).toHaveText("Visual label");

  await page.keyboard.press("Control+]");
  await expect(layerNames.first()).toHaveText("Box");
  await page.keyboard.press("Control+[");
  await expect(layerNames.first()).toHaveText("Visual label");

  await layers.getByRole("button", { name: /Select Visual label layer/ }).click();
  await page.keyboard.press("Meta+C");
  await page.keyboard.press("Meta+V");
  await expect(canvas.locator('[data-visual-kind="text"]')).toHaveCount(2);
  await page.keyboard.press("Backspace");
  await expect(canvas.locator('[data-visual-kind="text"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Add barcode", exact: true }).dragTo(canvas, {
    targetPosition: { x: 120, y: 180 },
  });
  const barcode = canvas.locator('[data-visual-kind="barcode"]');
  await expect(barcode).toHaveCount(1);
  await barcode.click();
  const barcodeType = page.getByRole("combobox", { name: "Barcode type", exact: true });
  await expect(barcodeType).toHaveValue("^BC");
  await barcodeType.selectOption("^B3");
  await expect(barcodeType).toHaveValue("^B3");
  await expect(page.getByText("The Code 39 barcode is the standard for many industries, including the US Department of Defense.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reveal field in ZPL", exact: true }).click();

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await expect(editorSurface).toContainText("Visual label");
  await expect(editorSurface).toContainText("^GB");
  await expect(editorSurface).toContainText("^B3");
  await expect(page.locator(".monaco-editor .highlighted-command-inline")).toHaveCount(0);
  await expect(page.getByText(/\d+ selected/, { exact: true })).toBeVisible();
});

test("scrolls the source editor to a field revealed from the Designer", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 80, y: 40 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  const padding = Array.from({ length: 90 }, (_, index) => `^FX source padding ${index + 1}`).join("\n");
  await page.keyboard.insertText(`^XA\n^PW812\n^LL1218\n${padding}\n^FO40,900^A0N,30,30^FDReveal target^FS\n^XZ`);
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("Meta+ArrowUp");
  await editorSurface.hover();
  await page.mouse.wheel(0, -100_000);
  await expect(editorSurface).toContainText("^XA");
  await expect(editorSurface).not.toContainText("Reveal target");

  await page.getByRole("button", { name: "Designer", exact: true }).click();
  await expect(page.getByTestId("visual-label-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Text at 40, 900", exact: true }).click();
  await page.getByRole("button", { name: "Reveal field in ZPL", exact: true }).click();

  await expect(page.getByTestId("zpl-editor")).toBeVisible();
  await expect(editorSurface).toContainText("Reveal target");
  await expect(page.getByText(/\d+ selected/, { exact: true })).toBeVisible();
  await expect(page.locator(".monaco-editor .highlighted-command-inline")).toHaveCount(0);
});

test("offers quick fixes and configurable live preview", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 80, y: 40 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("^XA^F010,20^FDQuick fix^FS^XZ");
  await page.keyboard.press("Escape");
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

test("keeps source text selectable and selects everything with the platform shortcut", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "New", exact: true }).click();

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  const selectionStyles = await editorSurface.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.userSelect, style.webkitUserSelect];
  });
  expect(selectionStyles).toContain("text");

  await editorSurface.click({ position: { x: 100, y: 12 } });
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("^XA^XZ");
  await expect(editorSurface).toContainText("^XA");
  await expect(editorSurface).not.toContainText("New label");
});

test("offers command-aware completion, snippets, and formatting", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "New", exact: true }).click();

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 100, y: 100 } });
  await page.keyboard.type("^F");
  await page.getByRole("button", { name: "Show ZPL completions" }).click();
  await expect(page.locator(".suggest-widget")).toBeVisible();
  await expect(page.locator(".suggest-widget .monaco-list-row").filter({ hasText: "^FD" }).first()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Commands", exact: true }).click();
  const commandSearch = page.getByLabel("Search all ZPL commands and parameters");
  await commandSearch.fill("code 128");
  await expect(page.getByRole("button", { name: /\^BC.*Code 128 Barcode/ })).toBeVisible();
  await page.getByRole("button", { name: /\^BC.*Code 128 Barcode/ }).click();
  await expect(page.getByRole("heading", { name: "Code 128 Barcode (Subsets A, B, and C)" })).toBeVisible();
  await expect(page.getByText("^BCo,h,f,g,e,m", { exact: true })).toBeVisible();
  await expect(page.getByText("orientation", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Insert parameter snippet", exact: true }).click();
  await page.getByRole("button", { name: "Files", exact: true }).click();
  await expect(page.getByRole("button", { name: /\^BC Code 128 Bar Code/ })).toBeVisible();

  await page.getByRole("button", { name: "Format", exact: true }).click();
  await expect(page.getByAltText("Rendered ZPL label")).toBeVisible();
});

test("completes parameter values and offers parameter quick fixes", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "New", exact: true }).click();

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 100, y: 12 } });
  await page.keyboard.press("End");
  await page.keyboard.type("\n^FW");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Show ZPL completions" }).click();
  const parameterSuggestions = page.locator(".suggest-widget .monaco-list-row").filter({ hasText: "^FW · rotate field" });
  await expect(parameterSuggestions).toHaveCount(4);
  const parameterSuggestion = parameterSuggestions.first();
  await expect(parameterSuggestion).toBeVisible();
  await expect(parameterSuggestion).toContainText("N");
  await expect(parameterSuggestion).toContainText("^FW · rotate field");
  await page.keyboard.press("Escape");

  await page.keyboard.type("X\n^XZ");
  await page.keyboard.press("Escape");
  const diagnostic = page.getByRole("button", { name: /INVALID_PARAMETER_VALUE/i });
  await expect(diagnostic).toContainText("Expected N, R, I, B");
  await diagnostic.click();
  await page.keyboard.press("Alt+Enter");
  await expect(page.locator(".actionList")).toBeVisible();
  await expect(page.locator(".actionList")).toContainText("Change rotate field to N");
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

  await page.getByRole("button", { name: "Designer", exact: true }).click();
  await expect(page.getByTestId("visual-label-canvas")).toBeVisible();
  results = await new AxeBuilder({ page })
    .exclude(".monaco-editor")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.getByTestId("visual-layers").getByRole("button").first().click();
  await page.getByRole("tab", { name: "Properties", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "Properties", exact: true })).toBeVisible();
  results = await new AxeBuilder({ page })
    .exclude(".monaco-editor")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole("button", { name: "Keyboard shortcuts", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Designer shortcuts", exact: true })).toBeVisible();
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

  await page.getByRole("button", { name: "Designer", exact: true }).click();
  await expect(page.getByTestId("visual-label-canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add text", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open layers panel", exact: true }).click();
  await expect(page.getByTestId("visual-layers")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
