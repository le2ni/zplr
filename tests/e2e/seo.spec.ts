import { expect, test } from "@playwright/test";

test("serves useful, indexable tool pages without JavaScript", async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    for (const [path, heading] of [
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
