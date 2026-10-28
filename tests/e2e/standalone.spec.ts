import { expect, test } from "@playwright/test";

test("opens the standalone editor from the repository root", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.getByTestId("zpl-editor")).toBeVisible();
});
