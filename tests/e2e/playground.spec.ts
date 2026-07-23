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
  await expect(page.getByAltText("Editable rendered ZPL label")).toBeVisible();
  await expect(page.getByText("ZPL II", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Problems: 0 errors, 0 warnings", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Retail UPC / EAN", exact: true }).click();
  await expect(page.getByAltText("Editable rendered ZPL label")).toBeVisible();

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await expect(editorSurface).toBeVisible();
  await editorSurface.click({ position: { x: 12, y: 12 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("^XA^PW64^LL32^QZbad^XZ");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Problems: \d+ errors, \d+ warnings/ }).click();
  const diagnostic = page.getByRole("button", { name: /UNKNOWN_COMMAND/i });
  await expect(diagnostic).toBeVisible();
  await diagnostic.click();
  await expect(page.locator(".monaco-editor .highlighted-command-inline")).toHaveCount(1);
  await expect(page.locator(".monaco-editor .squiggly-warning, .monaco-editor .squiggly-error")).not.toHaveCount(0);
});

test("uses the system color scheme as the default editor theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });

  const monaco = page.getByTestId("zpl-editor").locator(".monaco-editor").first();
  await expect(monaco).toHaveClass(/vs-dark/);
  await page.getByRole("button", { name: "Editor and printer settings", exact: true }).click();
  const themeSelect = page.locator("label.settings-field").filter({ hasText: "Editor theme" }).locator("select");
  await expect(themeSelect).toHaveValue("system");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(monaco).not.toHaveClass(/vs-dark/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(monaco).toHaveClass(/vs-dark/);

  await themeSelect.selectOption("light");
  await expect(monaco).not.toHaveClass(/vs-dark/);
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("zpl-editor").locator(".monaco-editor").first()).not.toHaveClass(/vs-dark/);
  await page.getByRole("button", { name: "Editor and printer settings", exact: true }).click();
  await expect(page.locator("label.settings-field").filter({ hasText: "Editor theme" }).locator("select"))
    .toHaveValue("light");
});

test("keeps multiple files, dirty state, and editor models independent", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  for (const action of ["New", "Open", "Save", "Save all"]) {
    await expect(page.getByRole("button", { name: action, exact: true })).toHaveCount(0);
  }

  const tabs = page.getByLabel("Open editor tabs");
  await page.keyboard.press("Control+N");
  await expect(tabs.getByRole("button", { name: "untitled.zpl", exact: true })).toBeVisible();
  await expect(tabs.getByRole("button", { name: "shipping-label.zpl", exact: true })).toBeVisible();

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 80, y: 40 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("^XA^PW320^LL180^FO20,20^A0N,30,30^FDSecond file^FS^XZ");
  await expect(tabs.getByRole("button", { name: "untitled.zpl Edited", exact: true })).toBeVisible();

  await tabs.getByRole("button", { name: "shipping-label.zpl", exact: true }).click();
  await expect(editorSurface).not.toContainText("Second file");
  await tabs.getByRole("button", { name: "untitled.zpl Edited", exact: true }).click();
  await expect(editorSurface).toContainText("Second file");
});

test("keeps Files sections collapsible with Outline closed initially", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });

  const openEditors = page.getByRole("button", { name: /^Open editors/ });
  const examples = page.getByRole("button", { name: /^Examples/ });
  const outline = page.getByRole("button", { name: /^Outline/ });
  await expect(openEditors).toHaveAttribute("aria-expanded", "true");
  await expect(examples).toHaveAttribute("aria-expanded", "true");
  await expect(outline).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: /^1 \^XA Start Format$/ })).toBeHidden();

  await outline.click();
  await expect(outline).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: /^1 \^XA Start Format$/ })).toBeVisible();
  await openEditors.click();
  await examples.click();
  await expect(openEditors).toHaveAttribute("aria-expanded", "false");
  await expect(examples).toHaveAttribute("aria-expanded", "false");
});

test("keeps code and WYSIWYG content and selection synchronized", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 80, y: 40 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  await page.keyboard.insertText("^XA\n^PW300\n^LL200\n^FO120,80^A0N,30,30^FDCode sync^FS\n^XZ");

  const visualField = page.getByRole("button", { name: "Text at 120, 80", exact: true });
  await expect(visualField).toBeVisible();
  await editorSurface.locator(".view-line").nth(3).click({ position: { x: 20, y: 8 } });
  await expect(page.getByText(/Ln 4, Col \d+/)).toBeVisible();
  await expect(visualField).toHaveClass(/selected/);

  await visualField.click();
  await expect(page.locator(".designer-root footer")).toContainText("selected");
  const content = page.getByRole("textbox", { name: "Field content", exact: true });
  await content.fill("Visual sync");
  await expect(editorSurface).toContainText("Visual sync");
  await expect(visualField).toHaveClass(/selected/);
});

test("hides inline parameter names while retaining parameter hover details", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 80, y: 40 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  await page.keyboard.insertText("^XA\n^PW300\n^LL200\n^FO120,80^GB100,50,4^FS\n^FO20,20^BQN,2,4^FDQA,https://example.com^FS\n^XZ");

  const fieldLine = editorSurface.locator(".view-line").nth(3);
  await expect(fieldLine).toContainText("^FO120,80");
  await expect(fieldLine).not.toContainText(/\b(?:x|y|w|t):/);
  await fieldLine.hover({ position: { x: 34, y: 8 } });
  const hover = page.locator(".monaco-hover:visible");
  await expect(hover).toBeVisible();
  await expect(hover).toContainText("x-axis location (in dots)");
  await expect(hover).toContainText("Values: 0 to 32000");

  await page.keyboard.press("Escape");
  const fieldDataLine = editorSurface.locator(".view-line").nth(4);
  await fieldDataLine.hover({ position: { x: 235, y: 8 } });
  await expect(hover).toContainText("Field Data");
  await expect(hover).toContainText("Parameter 1: data to be printed");
});

test("combines Code and WYSIWYG editing with visual source edits", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  const canvas = page.getByTestId("visual-label-canvas");
  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId("zpl-editor")).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview", exact: true })).toHaveCount(0);
  await canvas.focus();
  await page.keyboard.press("Shift+Slash");
  const shortcuts = page.getByRole("dialog", { name: "WYSIWYG shortcuts", exact: true });
  await expect(shortcuts).toBeVisible();
  await expect(shortcuts).toContainText("Copy selected layer");
  await expect(shortcuts).toContainText("Paste copied layer");
  await page.keyboard.press("Escape");

  const textField = page.getByRole("button", { name: "Text at 40, 40", exact: true });
  await expect(textField).toBeVisible();
  await textField.click();
  await expect(page.locator(".designer-root footer")).toContainText("selected");
  await expect(page.getByRole("spinbutton", { name: "X dots", exact: true })).toHaveValue("40");
  await expect(canvas.locator("[data-resize-handle]")).toHaveCount(0);
  const textBounds = await textField.boundingBox();
  expect(textBounds).not.toBeNull();
  await page.mouse.move(textBounds!.x + textBounds!.width - 1, textBounds!.y + textBounds!.height / 2);
  await expect.poll(() => textField.evaluate((element) => getComputedStyle(element).cursor)).toBe("ew-resize");
  await page.mouse.move(textBounds!.x + textBounds!.width / 2, textBounds!.y + textBounds!.height / 2);
  await expect.poll(() => textField.evaluate((element) => getComputedStyle(element).cursor)).toBe("grab");

  await textField.dblclick();
  const inlineText = page.getByRole("textbox", { name: "Edit text inline", exact: true });
  await expect(inlineText).toBeVisible();
  await expect(page.locator(".designer-inline-text")).toHaveCount(0);
  await inlineText.fill("Inline label");
  await expect(editorSurface).toContainText("Inline label");
  await inlineText.press("Enter");
  await expect(inlineText).toBeHidden();

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
  const resizeBounds = await box.boundingBox();
  expect(resizeBounds).not.toBeNull();
  await page.mouse.move(resizeBounds!.x + resizeBounds!.width - 1, resizeBounds!.y + resizeBounds!.height - 1);
  await expect.poll(() => box.evaluate((element) => getComputedStyle(element).cursor)).toBe("nwse-resize");
  await page.mouse.down();
  await page.mouse.move(resizeBounds!.x + resizeBounds!.width + 20, resizeBounds!.y + resizeBounds!.height + 12, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => Number(await boxWidth.inputValue())).toBeGreaterThan(240);
  await expect.poll(async () => Number(await boxHeight.inputValue())).toBeGreaterThan(120);
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

  await expect(editorSurface).toContainText("Visual label");
  await expect(editorSurface).toContainText("^GB");
  await expect(editorSurface).toContainText("^B3");
  await expect(page.locator(".monaco-editor .highlighted-command-inline")).toHaveCount(0);
  await expect(page.locator(".designer-root footer")).toContainText("selected");
});

test("positions the inline caret from rendered glyph advances", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  const field = page.locator('.designer-field[data-visual-kind="text"]');
  await expect(field).toHaveCount(1);
  await expect(field).toBeVisible();
  const initialBounds = await field.boundingBox();
  expect(initialBounds).not.toBeNull();
  await field.click();
  await page.getByRole("textbox", { name: "Field content", exact: true }).fill("WiWi");
  await expect.poll(async () => (await field.boundingBox())?.width ?? initialBounds!.width)
    .toBeLessThan(initialBounds!.width * 0.75);

  await field.dblclick({ position: { x: 2, y: Math.max(2, initialBounds!.height / 2) } });
  const editor = page.getByRole("textbox", { name: "Edit text inline", exact: true });
  const caret = page.getByTestId("inline-caret");
  await expect(editor).toBeVisible();
  const selectionFrame = await field.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderWidth: style.borderTopWidth,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow,
    };
  });
  expect(selectionFrame).toEqual({ borderWidth: "1px", outlineStyle: "none", boxShadow: "none" });
  await editor.press("Home");
  await expect(caret).toHaveAttribute("data-caret-offset", "0");
  const first = await caret.boundingBox();
  expect(first).not.toBeNull();

  await editor.press("ArrowRight");
  await expect(caret).toHaveAttribute("data-caret-offset", "1");
  const afterWideGlyph = await caret.boundingBox();
  expect(afterWideGlyph).not.toBeNull();

  await editor.press("ArrowRight");
  await expect(caret).toHaveAttribute("data-caret-offset", "2");
  const afterNarrowGlyph = await caret.boundingBox();
  expect(afterNarrowGlyph).not.toBeNull();

  const wideAdvance = afterWideGlyph!.x - first!.x;
  const narrowAdvance = afterNarrowGlyph!.x - afterWideGlyph!.x;
  expect(wideAdvance).toBeGreaterThan(narrowAdvance * 1.5);
});

test("edits barcode and QR payloads in inline input boxes", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  const canvas = page.getByTestId("visual-label-canvas");
  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 80, y: 40 } });
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText([
    "^XA",
    "^PW600",
    "^LL400",
    "^FO40,40",
    "^BCN,80,Y,N,N",
    "^FD1234567890^FS",
    "^FO350,40",
    "^BQN,2,5",
    "^FDQA,https://example.com^FS",
    "^XZ",
  ].join("\n"));
  const barcode = canvas.locator('[data-visual-kind="barcode"]');
  const qrCode = canvas.locator('[data-visual-kind="qr"]');
  await expect(barcode).toHaveCount(1);
  await expect(qrCode).toHaveCount(1);
  await expect(barcode).toBeVisible();
  await expect(qrCode).toBeVisible();
  await expect(page.getByRole("region", { name: "WYSIWYG label editor", exact: true }))
    .toContainText("600 × 400 dots");
  await expect.poll(async () => {
    const bounds = await canvas.boundingBox();
    return bounds ? bounds.width / bounds.height : 0;
  }).toBeGreaterThan(1);
  const barcodeBounds = await barcode.boundingBox();
  expect(barcodeBounds).not.toBeNull();
  await barcode.dblclick({ position: { x: barcodeBounds!.width / 2, y: barcodeBounds!.height / 2 } });
  const barcodeInput = page.getByRole("textbox", { name: "Edit barcode data inline", exact: true });
  await expect(barcodeInput).toBeVisible();
  await expect(barcodeInput).toHaveValue("1234567890");
  await barcodeInput.fill("9876543210");
  await expect(editorSurface).toContainText("^FD9876543210^FS");
  await barcodeInput.press("Enter");
  await expect(barcodeInput).toBeHidden();

  const qrBounds = await qrCode.boundingBox();
  expect(qrBounds).not.toBeNull();
  await qrCode.dblclick({ position: { x: qrBounds!.width / 2, y: qrBounds!.height / 2 } });
  const qrInput = page.getByRole("textbox", { name: "Edit qr code data inline", exact: true });
  await expect(qrInput).toBeVisible();
  await expect(qrInput).toHaveValue("https://example.com");
  await qrInput.fill("https://zplr.dev/labels");
  await expect(editorSurface).toContainText("^FDQA,https://zplr.dev/labels^FS");
  await qrInput.press("Enter");
  await expect(qrInput).toBeHidden();
});

test("zooms around the pointer and pans with touchpad wheel gestures", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 80, y: 40 } });
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText("^XA\n^PW1218\n^LL812\n^FO40,40^A0N,40,40^FDGesture test^FS\n^XZ");
  await expect(page.getByRole("region", { name: "WYSIWYG label editor", exact: true }))
    .toContainText("1218 × 812 dots");

  const viewport = page.locator(".designer-viewport");
  const canvas = page.getByTestId("visual-label-canvas");
  const zoomReadout = page.getByTitle("Fit label", { exact: true });
  await expect(viewport).toBeVisible();
  await expect(canvas).toBeVisible();

  const viewportBounds = await viewport.boundingBox();
  expect(viewportBounds).not.toBeNull();
  const anchor = {
    x: viewportBounds!.x + viewportBounds!.width * 0.55,
    y: viewportBounds!.y + viewportBounds!.height * 0.55,
  };
  await page.mouse.move(anchor.x, anchor.y);
  await page.keyboard.down("Control");
  try {
    await page.mouse.wheel(0, -50);
    await page.mouse.wheel(0, -50);
    await page.mouse.wheel(0, -50);
  } finally {
    await page.keyboard.up("Control");
  }
  await expect(zoomReadout).toHaveText("250%");
  const overflowAtMaximumZoom = await viewport.evaluate((element) => {
    const canvasElement = element.querySelector<HTMLElement>('[data-testid="visual-label-canvas"]');
    return {
      canvasWidth: canvasElement?.getBoundingClientRect().width ?? 0,
      scrollWidth: element.scrollWidth,
    };
  });
  expect(overflowAtMaximumZoom.scrollWidth).toBeGreaterThan(overflowAtMaximumZoom.canvasWidth + 50);

  const beforeZoom = await canvas.boundingBox();
  expect(beforeZoom).not.toBeNull();
  const anchorFraction = {
    x: (anchor.x - beforeZoom!.x) / beforeZoom!.width,
    y: (anchor.y - beforeZoom!.y) / beforeZoom!.height,
  };
  await page.keyboard.down("Control");
  try {
    await page.mouse.wheel(0, 20);
  } finally {
    await page.keyboard.up("Control");
  }
  await expect(zoomReadout).not.toHaveText("250%");
  const afterZoom = await canvas.boundingBox();
  expect(afterZoom).not.toBeNull();
  expect(Math.abs(afterZoom!.x + afterZoom!.width * anchorFraction.x - anchor.x)).toBeLessThan(3);
  expect(Math.abs(afterZoom!.y + afterZoom!.height * anchorFraction.y - anchor.y)).toBeLessThan(3);

  const zoomBeforePan = await zoomReadout.textContent();
  const scrollBeforePan = await viewport.evaluate((element) => ({
    left: element.scrollLeft,
    top: element.scrollTop,
  }));
  await page.mouse.wheel(60, 80);
  await expect.poll(async () => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(scrollBeforePan.left);
  await expect.poll(async () => viewport.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(scrollBeforePan.top);
  await expect(zoomReadout).toHaveText(zoomBeforePan ?? "");

  await page.mouse.wheel(-100_000, -100_000);
  await expect.poll(async () => viewport.evaluate((element) => [element.scrollLeft, element.scrollTop]))
    .toEqual([0, 0]);
  await page.mouse.wheel(100_000, 100_000);
  const maximumScroll = await viewport.evaluate((element) => ({
    left: element.scrollWidth - element.clientWidth,
    top: element.scrollHeight - element.clientHeight,
  }));
  await expect.poll(async () => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(maximumScroll.left - 1);
  await expect.poll(async () => viewport.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(maximumScroll.top - 1);
});

test("uses distinct snapline colors for the label and other objects", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  const canvas = page.getByTestId("visual-label-canvas");
  await page.getByRole("button", { name: "Add box", exact: true }).click();
  let box = page.getByRole("button", { name: "Box at 360, 580", exact: true });
  await expect(box).toBeVisible();

  const canvasBounds = await canvas.boundingBox();
  const initialBoxBounds = await box.boundingBox();
  expect(canvasBounds).not.toBeNull();
  expect(initialBoxBounds).not.toBeNull();
  await page.mouse.move(
    initialBoxBounds!.x + initialBoxBounds!.width / 2,
    initialBoxBounds!.y + initialBoxBounds!.height / 2,
  );
  await page.mouse.down();
  let labelGuideColor = "";
  try {
    await page.mouse.move(
      canvasBounds!.x + canvasBounds!.width / 2,
      initialBoxBounds!.y + initialBoxBounds!.height / 2,
      { steps: 8 },
    );
    const labelGuide = canvas.locator('.designer-smart-guide[data-snap-kind="label"]');
    await expect(labelGuide).toBeVisible();
    labelGuideColor = await labelGuide.evaluate((element) => getComputedStyle(element).backgroundColor);
  } finally {
    await page.mouse.up();
  }

  box = canvas.locator('[data-visual-kind="box"]');
  await expect(box).toHaveCount(1);
  await expect(box).toBeVisible();
  const text = canvas.locator('[data-visual-kind="text"]');
  await expect(text).toHaveCount(1);
  const snappedBoxBounds = await box.boundingBox();
  const textBounds = await text.boundingBox();
  expect(snappedBoxBounds).not.toBeNull();
  expect(textBounds).not.toBeNull();
  await page.mouse.move(
    snappedBoxBounds!.x + snappedBoxBounds!.width / 2,
    snappedBoxBounds!.y + snappedBoxBounds!.height / 2,
  );
  await page.mouse.down();
  let objectGuideColor = "";
  try {
    await page.mouse.move(
      textBounds!.x + snappedBoxBounds!.width / 2,
      snappedBoxBounds!.y + snappedBoxBounds!.height / 2,
      { steps: 8 },
    );
    const objectGuide = canvas.locator('.designer-smart-guide[data-snap-kind="object"]');
    await expect(objectGuide).toBeVisible();
    objectGuideColor = await objectGuide.evaluate((element) => getComputedStyle(element).backgroundColor);
  } finally {
    await page.mouse.up();
  }

  expect(labelGuideColor).toContain("59, 130, 246");
  expect(objectGuideColor).toContain("16, 185, 129");
  expect(labelGuideColor).not.toBe(objectGuideColor);
});

test("scrolls the code editor to a field revealed from WYSIWYG", async ({ page }) => {
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
  await expect(editorSurface).not.toContainText("Reveal");

  await expect(page.getByTestId("visual-label-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Text at 40, 900", exact: true }).click();
  await page.getByRole("button", { name: "Reveal field in ZPL", exact: true }).click();

  await expect(page.getByTestId("zpl-editor")).toBeVisible();
  await expect(editorSurface).toContainText("Reveal");
  await expect(editorSurface).toContainText("target");
  await expect(page.locator(".designer-root footer")).toContainText("selected");
  await expect(page.locator(".monaco-editor .highlighted-command-inline")).toHaveCount(0);
});

test("offers quick fixes and configurable live WYSIWYG rendering", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 80, y: 40 } });
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("^XA^F010,20^FDQuick fix^FS^XZ");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Problems: \d+ errors, \d+ warnings/ }).click();
  const diagnostic = page.getByRole("button", { name: /UNKNOWN_COMMAND/i });
  await expect(diagnostic).toBeVisible();
  await diagnostic.click();
  await page.keyboard.press("Alt+Enter");
  await expect(page.locator(".actionList")).toBeVisible();
  await expect(page.locator(".actionList")).toContainText(/Change to \^[A-Z0-9~]{2}/);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Editor and printer settings", exact: true }).click();
  await page.getByRole("combobox", { name: "Label size", exact: true }).selectOption("custom");
  await page.getByRole("spinbutton", { name: "Width (dots)", exact: true }).fill("320");
  await page.getByRole("spinbutton", { name: "Height (dots)", exact: true }).fill("180");
  await expect(page.getByText(/320 × 180 dots · 203 dpi/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Download PNG", exact: true })).toBeVisible();

  await page.getByRole("checkbox", { name: "Render automatically while typing", exact: true }).uncheck();
  await page.getByRole("spinbutton", { name: "Width (dots)", exact: true }).fill("360");
  await page.getByRole("button", { name: "Close settings", exact: true }).click();
  await expect(page.getByRole("button", { name: "Render updated source", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Render updated source", exact: true }).click();
  await expect(page.getByText(/360 × 180 dots · 203 dpi/)).toBeVisible();
});

test("keeps source text selectable and selects everything with the platform shortcut", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

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
  await page.keyboard.press("Control+N");

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 100, y: 100 } });
  await page.keyboard.type("^F");
  await page.keyboard.press("Control+Space");
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
  await page.getByRole("button", { name: /^Outline/ }).click();
  await expect(page.getByRole("button", { name: /\^BC Code 128 Bar Code/ })).toBeVisible();

  await page.keyboard.press("Control+Shift+F");
  await expect(page.getByAltText("Editable rendered ZPL label")).toBeVisible();
});

test("completes parameter values and offers parameter quick fixes", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 100, y: 12 } });
  await page.keyboard.press("End");
  await page.keyboard.type("\n^FW");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+Space");
  const parameterSuggestions = page.locator(".suggest-widget .monaco-list-row").filter({ hasText: "^FW · rotate field" });
  await expect(parameterSuggestions).toHaveCount(4);
  const parameterSuggestion = parameterSuggestions.first();
  await expect(parameterSuggestion).toBeVisible();
  await expect(parameterSuggestion).toContainText("N");
  await expect(parameterSuggestion).toContainText("^FW · rotate field");
  await page.keyboard.press("Escape");

  await page.keyboard.type("X\n^XZ");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Problems: \d+ errors, \d+ warnings/ }).click();
  const diagnostic = page.getByRole("button", { name: /INVALID_PARAMETER_VALUE/i });
  await expect(diagnostic).toContainText("Expected N, R, I, B");
  await diagnostic.click();
  await page.keyboard.press("Alt+Enter");
  await expect(page.locator(".actionList")).toBeVisible();
  await expect(page.locator(".actionList")).toContainText("Change rotate field to N");
});

test("arranges, locks, and hides a multi-layer visual selection", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  const canvas = page.getByTestId("visual-label-canvas");
  const textField = page.getByRole("button", { name: "Text at 40, 40", exact: true });
  await expect(textField).toBeVisible();
  await page.getByRole("button", { name: "Add box", exact: true }).click();
  const box = page.getByRole("button", { name: "Box at 360, 580", exact: true });
  await expect(box).toBeVisible();

  await textField.click();
  await box.click({ modifiers: ["Shift"] });
  const visualFooter = page.locator(".designer-root footer");
  await expect(visualFooter).toContainText("2 layers selected");
  await page.getByLabel("WYSIWYG grid snap").selectOption("10");
  await box.press("ArrowRight");
  await expect(page.getByRole("button", { name: "Text at 50, 40", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Box at 370, 580", exact: true })).toBeVisible();

  const arrange = page.locator("details.designer-arrange").filter({ has: page.getByText("Arrange", { exact: true }) });
  await arrange.locator("summary").click();
  await arrange.getByRole("button", { name: "Left", exact: true }).click();
  await expect(page.getByRole("button", { name: "Box at 50, 580", exact: true })).toBeVisible();
  await arrange.getByRole("button", { name: "Lock", exact: true }).click();
  await expect(editorSurface).toContainText("ZPLR-LOCK-1");
  await expect(visualFooter).toContainText("locked");

  await arrange.locator("summary").click();
  await arrange.getByRole("button", { name: "Unlock", exact: true }).click();
  await arrange.locator("summary").click();
  await arrange.getByRole("button", { name: "Hide from output", exact: true }).click();
  await expect(canvas.locator("[data-visual-kind]")).toHaveCount(0);
  await expect(editorSurface).toContainText("ZPLR-HIDDEN-1");
  await expect(page.getByRole("region", { name: "Hidden layers", exact: true })).toBeVisible();

  await page.getByLabel("Horizontal ruler").dblclick({ position: { x: 120, y: 6 } });
  await expect(canvas.locator(".designer-manual-guide")).toHaveCount(1);
});

test("binds visual text to live variable-data records", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  await page.getByTitle("Variable data and batch preview").click();
  const dataDialog = page.getByRole("dialog", { name: "Variable data", exact: true });
  await expect(dataDialog).toBeVisible();
  await dataDialog.locator(".data-welcome").getByRole("button", { name: "New dataset", exact: true }).click();
  await dataDialog.getByLabel("Field 1 for Record 1", { exact: true }).fill("Ada Lovelace");
  await dataDialog.getByTitle("Close variable data").click();

  await page.getByRole("button", { name: "Text at 40, 40", exact: true }).click();
  await page.getByRole("combobox", { name: "Field binding", exact: true }).selectOption("1");
  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await expect(editorSurface).toContainText("^FN1");
  await expect(page.getByLabel("Record 1 value", { exact: true })).toHaveValue("Ada Lovelace");
  await page.getByLabel("Record 1 value", { exact: true }).fill("Grace Hopper");

  await page.getByTitle("Variable data and batch preview").click();
  await expect(dataDialog.getByLabel("Field 1 for Record 1", { exact: true })).toHaveValue("Grace Hopper");
  await dataDialog.getByRole("button", { name: "Add record", exact: true }).click();
  await dataDialog.getByLabel("Field 1 for Record 2", { exact: true }).fill("Lord Byron");
  await expect(dataDialog.getByRole("button", { name: "Batch PNGs", exact: true })).toBeEnabled();
  await dataDialog.getByTitle("Close variable data").click();

  await expect(page.getByLabel("Variable-data record navigator")).toBeVisible();
  await expect(page.getByLabel("Record 2 value", { exact: true })).toHaveValue("Lord Byron");
  await page.getByTitle("Previous record").click();
  await expect(page.getByLabel("Record 1 value", { exact: true })).toHaveValue("Grace Hopper");
});

test("imports, places, and atomically renames an image resource", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Control+N");

  await page.getByTitle("Import and manage images and fonts").click();
  const resourceDialog = page.getByRole("dialog", { name: "Images & fonts", exact: true });
  await expect(resourceDialog).toBeVisible();
  await resourceDialog.locator('input[type="file"][accept="image/*,.svg"]').setInputFiles("web/assets/logo.svg");
  await expect(resourceDialog.getByText("R:LOGO.GRF", { exact: false })).toBeVisible({ timeout: 30_000 });
  await resourceDialog.getByRole("button", { name: "Import and place image", exact: true }).click();

  const resource = resourceDialog.getByRole("button", { name: /R:LOGO\.GRF/ });
  await expect(resource).toBeVisible();
  await resource.click();
  await resourceDialog.getByLabel("Resource name", { exact: true }).fill("brand");
  await resourceDialog.getByRole("button", { name: "Rename everywhere", exact: true }).click();
  await expect(resourceDialog.getByRole("button", { name: /R:BRAND\.GRF/ })).toBeVisible();
  await expect(resourceDialog.getByRole("button", { name: /logo\.svg.*download/ })).toBeVisible();
  await resourceDialog.getByTitle("Close resource manager").click();

  const editorSurface = page.getByTestId("zpl-editor").locator(".monaco-editor .view-lines");
  await expect(editorSurface).toContainText("R:BRAND.GRF");
  await expect(page.getByTestId("visual-label-canvas").locator('[data-visual-kind="graphic"]')).toHaveCount(1);
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

  await expect(page.getByTestId("visual-label-canvas")).toBeVisible();
  results = await new AxeBuilder({ page })
    .exclude(".monaco-editor")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole("button", { name: "Open layers panel", exact: true }).click();
  await page.getByTestId("visual-layers").getByRole("button").first().click();
  await page.getByRole("tab", { name: "Properties", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "Properties", exact: true })).toBeVisible();
  results = await new AxeBuilder({ page })
    .exclude(".monaco-editor")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole("button", { name: "Keyboard shortcuts", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "WYSIWYG shortcuts", exact: true })).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Code", exact: true })).toBeVisible();
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  await expect(page.getByRole("button", { name: /Preview/ })).toHaveCount(0);
  await page.getByRole("button", { name: "WYSIWYG", exact: true }).click();
  await expect(page.getByTestId("visual-label-canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add text", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open layers panel", exact: true }).click();
  await expect(page.getByTestId("visual-layers")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
