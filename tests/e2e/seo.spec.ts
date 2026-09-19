import { expect, test } from "@playwright/test";
import { disableServiceWorker } from "./helpers";

test("serves useful, indexable tool pages without JavaScript", async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    for (const [path, heading] of [
      ["/", "How to view a ZPL file online"],
      ["/editor", "How to edit and export a ZPL label"],
    ]) {
      const response = await page.goto(path!);
      expect(response?.status()).toBe(200);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://zplr.de${path}`);
      await expect(page.getByRole("heading", { name: heading!, exact: true })).toBeVisible();
      await expect(page.locator('a[href="/zpl-commands/caret-pw"]').first()).toBeVisible();
    }
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<loc>https://zplr.de/editor</loc>");
    expect((await request.get("/not-a-zplr-route")).status()).toBe(404);
    expect((await request.get("/zpl-commands/not-a-command")).status()).toBe(404);
  } finally {
    await context.close();
  }
});

test("opens a local ZPL file, downloads its preview, and continues with the same source", async ({ page, context }) => {
  await disableServiceWorker(context);
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto("/");
  const viewer = page.getByTestId("homepage-zpl-viewer");
  const source = "^XA\n^PW240\n^LL120\n^FO10,10^A0N,24,24^FDLocal file test^FS\n^XZ";
  await viewer.getByLabel("Open ZPL file", { exact: true }).setInputFiles({
    name: "local-label.zpl", mimeType: "text/plain", buffer: Buffer.from(source),
  });
  await expect(viewer.getByLabel("ZPL code to preview")).toHaveValue(source);
  await expect(viewer).toContainText("240 × 120 dots", { timeout: 30_000 });
  await expect(viewer.getByRole("link", { name: "Download PNG" })).toHaveAttribute("href", /^data:image\/png;base64,/);
  const downloadEvent = page.waitForEvent("download");
  await viewer.getByRole("link", { name: "Download PNG" }).click();
  expect((await downloadEvent).suggestedFilename()).toBe("zpl-label.png");
  await viewer.getByRole("link", { name: "Open full editor" }).click();
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".monaco-editor .view-lines")).toContainText("Local file test");
  await expect(page.getByRole("heading", { name: "How to edit and export a ZPL label" })).toBeAttached();
});

test("keeps the current source when the quick viewer rejects an oversized file", async ({ page, context }) => {
  await disableServiceWorker(context);
  await page.goto("/");
  const viewer = page.getByTestId("homepage-zpl-viewer");
  const original = await viewer.getByLabel("ZPL code to preview").inputValue();
  await viewer.getByLabel("Open ZPL file", { exact: true }).setInputFiles({
    name: "large-label.zpl", mimeType: "text/plain", buffer: Buffer.alloc(256_001, "X"),
  });
  await expect(viewer.getByRole("alert")).toContainText("Open larger labels in the full editor");
  await expect(viewer.getByLabel("ZPL code to preview")).toHaveValue(original);
});
