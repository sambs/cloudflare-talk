import { expect, test } from "@playwright/test";

// A fresh event per test gets its own EventSale Durable Object
const newEvent = () => `test-${crypto.randomUUID()}`;

test("buyer sees every seat available on a new event", async ({ page }) => {
  await page.goto(`/?event=${newEvent()}`);

  const seatMap = page.getByRole("list", { name: "Seat map" });
  await expect(seatMap.getByRole("listitem")).toHaveCount(32);
  await expect(seatMap.getByLabel("A1 available")).toBeVisible();
  await expect(seatMap.getByLabel("D8 available")).toBeVisible();
});

test("dashboard shows the same event's seat map", async ({ page }) => {
  const eventId = newEvent();
  await page.goto(`/dashboard.html?event=${eventId}`);

  await expect(
    page.getByRole("heading", { name: `Dashboard: ${eventId}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Seat map" }).getByRole("listitem"),
  ).toHaveCount(32);
});
