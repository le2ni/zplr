import { devices, expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { disableServiceWorker } from "./helpers";

test.beforeEach(async ({ page, context }) => {
  await disableServiceWorker(context);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("serves documentation data on the static host", async ({ request }) => {
  const index = await request.get("/api/zpl-documentation.json");
  expect(index.status()).toBe(200);
  expect(index.headers()["content-type"]).toContain("application/json");
  const catalog = await index.json();
  expect(catalog.coverage.commands).toBe(223);
  expect(catalog.directory).toHaveLength(223);

  const response = await request.get("/api/zpl-documentation/caret-fo.json");
  expect(response.status()).toBe(200);
  const { guide } = await response.json();
  expect(guide.slug).toBe("caret-fo");
  expect(guide.canonical).toBe("^FO");
  expect((await request.get("/api/zpl-documentation/not-a-command.json")).status()).toBe(404);
});

test("loads command pages when their prerendered payloads are unavailable", async ({ page }) => {
  // Exercise useFetch's fallback after client navigation. Normal direct loads
  // can pass using SSR/payload data even when every deployed API URL is 404.
  await page.route(/\/zpl-commands(?:\/[^/?]+)?\/_payload\.json(?:\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[{}]" }));
  await page.goto("/");
  const indexResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/zpl-documentation.json" && response.status() === 200);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Commands" }).click();
  await indexResponse;
  await expect(page.locator(".command-directory-grid a")).toHaveCount(223);

  const guideResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/zpl-documentation/caret-fo.json" && response.status() === 200);
  await page.locator('.command-directory-grid a[href="/zpl-commands/caret-fo"]').click();
  await guideResponse;
  await expect(page.getByRole("heading", { name: "Field Origin" })).toBeVisible();
  await expect(page.getByText("^FOx,y,z", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Edit in editor/ }).first()).toBeVisible();
});

test("uses the full site toolbar on command pages", async ({ page }) => {
  for (const path of ["/", "/zpl-commands", "/zpl-commands/caret-fo"]) {
    await page.goto(path);
    const navigation = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(navigation).toBeVisible();
    await expect(navigation.getByText("Label systems", { exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Workflow" })).toHaveAttribute("href", "/#features");
    await expect(navigation.getByRole("link", { name: "Designer" })).toHaveAttribute("href", "/#designer");
    await expect(navigation.getByRole("link", { name: "Library" })).toHaveAttribute("href", "/#library");
    await expect(navigation.getByRole("link", { name: "Commands" })).toHaveAttribute("href", "/zpl-commands");
    await expect(navigation.getByRole("link", { name: "GitHub" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Open Editor" })).toHaveAttribute("href", "/editor");
  }
});

test("browses and filters the complete command catalog", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/zpl-commands");
  await expect(page.getByRole("heading", { name: "Every ZPL command, explained and ready to render." })).toBeVisible();
  await expect(page.locator(".command-card")).toHaveCount(60);
  await expect(page.locator(".command-directory-grid a")).toHaveCount(223);
  const directoryRoutes = await page.locator(".command-directory-grid a").evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).getAttribute("href")),
  );
  expect(new Set(directoryRoutes).size).toBe(223);
  await expect(page.getByAltText("Rendered sample for ^A Scalable/Bitmapped Font")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("1,552", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show all 223 commands" }).click();
  await expect(page.locator(".command-card")).toHaveCount(223);

  const search = page.getByRole("searchbox", { name: "Search commands and parameters" });
  await search.fill("field origin");
  await expect(page.locator(".command-card")).toHaveCount(2);
  await expect(page.locator(".command-card").getByText("^FO", { exact: true })).toBeVisible();

  await search.fill("");
  await page.getByLabel("Category").selectOption("barcode");
  await expect(page.locator(".command-card")).toHaveCount(31);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".command-card")).toHaveCount(60);
  expect(browserErrors).toEqual([]);
});

test("renders visual examples lazily and keeps device commands code-only", async ({ page }) => {
  await page.goto("/zpl-commands");
  await expect(page.getByRole("heading", { name: "Every ZPL command, explained and ready to render." })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/zpl-commands/caret-fo");
  await expect(page.getByRole("heading", { name: "Field Origin" })).toBeVisible();
  await expect(page.getByText("^FOx,y,z", { exact: true })).toBeVisible();
  await expect(
    page.getByAltText("Representative rendered sample for ^FO Field Origin"),
  ).toBeVisible({ timeout: 30_000 });
  const firstComparison = page.locator(".example-comparison").first();
  await firstComparison.scrollIntoViewIfNeeded();
  await expect(firstComparison.getByText("Side-by-side comparison", { exact: true })).toBeVisible();
  const variations = firstComparison.locator(".example-variation");
  await expect(variations).toHaveCount(3);
  await expect(firstComparison.getByText("Renderer", { exact: true })).toHaveCount(3);
  const variationLayout = await variations.evaluateAll(([first, second]) => {
    const firstBounds = first!.getBoundingClientRect();
    const secondBounds = second!.getBoundingClientRect();
    return {
      sameRow: Math.abs(firstBounds.top - secondBounds.top) < 2,
      separated: secondBounds.left >= firstBounds.right - 2,
    };
  });
  expect(variationLayout).toEqual({ sameRow: true, separated: true });
  const firstPreview = page.getByAltText(/Rendered label for \^FO/).first();
  await expect(firstPreview).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: /Edit in editor/ }).first()).toHaveAttribute(
    "href",
    /\/editor#example=caret-fo-/,
  );

  await page.goto("/zpl-commands/caret-b0");
  await expect(page.getByRole("heading", { name: "Aztec Barcode Parameters" })).toBeVisible();
  const barcodeComparison = page.locator(".example-comparison").first();
  await barcodeComparison.scrollIntoViewIfNeeded();
  await expect(barcodeComparison.getByText("Renderer", { exact: true })).toHaveCount(3);
  await expect(barcodeComparison.locator("img")).toHaveCount(3, { timeout: 30_000 });
  await expect(barcodeComparison.locator("img").first()).toBeVisible();
  const barcodeSources = await barcodeComparison.locator("pre").allTextContents();
  expect(barcodeSources).toHaveLength(3);
  expect(barcodeSources.every((source) =>
    source.includes("^XA") &&
    source.includes("^FDHELLO AZTEC^FS") &&
    source.includes("^XZ")
  )).toBe(true);

  await page.goto("/zpl-commands/caret-rw");
  await expect(page.getByRole("heading", { name: "Set RF Power Levels for Read and Write" })).toBeVisible();
  await expect(page.getByText(/These are code examples only/)).toBeVisible();
  await expect(page.getByText("Renderer", { exact: true })).toHaveCount(0);

  await page.goto("/zpl-commands/caret-cc");
  await expect(page.getByText(/does not produce a standalone label image/)).toBeVisible();
  await expect(page.getByText("Renderer", { exact: true })).toHaveCount(0);

  await page.goto("/zpl-commands/caret-jm");
  await expect(page.getByText(/recognized but not implemented/)).toBeVisible();
  await expect(page.getByText("Renderer", { exact: true })).toHaveCount(0);
});

test("renders distinct, resolved ^FC clock examples", async ({ page }) => {
  await page.goto("/zpl-commands/caret-fc#parameter-0-0-0-a");
  const comparison = page.locator(".example-comparison").first();
  await comparison.scrollIntoViewIfNeeded();

  const previews = comparison.locator("img");
  await expect(previews).toHaveCount(2);
  await expect(previews.first()).toBeVisible({ timeout: 30_000 });
  await expect(previews.last()).toBeVisible({ timeout: 30_000 });

  const hashes = await previews.evaluateAll((images) =>
    images.map((image) => {
      const source = (image as HTMLImageElement).src;
      let hash = 2_166_136_261;
      for (let index = 0; index < source.length; index++) {
        hash = Math.imul(hash ^ source.charCodeAt(index), 16_777_619) >>> 0;
      }
      return hash;
    }),
  );
  expect(new Set(hashes).size).toBe(2);

  const sources = await comparison.locator("pre").allTextContents();
  expect(sources).toHaveLength(2);
  expect(sources[0]).toContain("^FDPrimary [%]  %Y-%m-%d %H:%M:%S");
  expect(sources[1]).toContain("^FDPrimary [@]  @Y-@m-@d @H:@M:@S");
});

test("opens a documentation example in a new editor workspace tab", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByTestId("zpl-editor")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("shipping-label.zpl", { exact: true }).first()).toBeVisible();

  await page.goto("/zpl-commands/caret-fo");
  await page.getByRole("link", { name: /Edit in editor/ }).first().click();
  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.getByText(/\^FO example opened as caret-fo-recommended\.zpl/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("shipping-label.zpl", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("caret-fo-recommended.zpl", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".editor-tab")).toHaveCount(2);
});

test("keeps the command index accessible", async ({ page }) => {
  await page.goto("/zpl-commands");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("keeps command documentation usable on a narrow dark viewport", async ({ browser }) => {
  const consoleErrors: string[] = [];
  const context = await browser.newContext({
    ...devices["Pixel 5"],
    baseURL: test.info().project.use.baseURL as string,
    colorScheme: "dark",
    locale: "de-DE",
  });
  await disableServiceWorker(context);
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/zpl-commands/caret-fo");
  await expect(page.getByRole("heading", { name: "Field Origin" })).toBeVisible();
  await page.locator(".example-card").first().scrollIntoViewIfNeeded();
  await expect(page.getByAltText(/Representative rendered sample for \^FO/)).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(consoleErrors).toEqual([]);
  await context.close();
});
