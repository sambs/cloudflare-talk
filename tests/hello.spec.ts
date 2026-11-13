import { expect, test } from "@playwright/test";

test("worker greets the world", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Hello World!")).toBeVisible();
});
