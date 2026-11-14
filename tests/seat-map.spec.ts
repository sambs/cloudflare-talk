import { expect, test } from "@playwright/test";
import { joinAs, newEvent, seat } from "./helpers.ts";

test("buyer sees every seat available on a new event", async ({ page }) => {
  await joinAs(page, "Alice", newEvent());

  const seatMap = page.getByRole("list", { name: "Seat map" });
  await expect(seatMap.getByRole("listitem")).toHaveCount(32);
  await expect(seat(page, "A1")).toHaveAccessibleName("A1 available");
  await expect(seat(page, "D8")).toHaveAccessibleName("D8 available");
});

test("nickname is remembered on this device", async ({ page }) => {
  const eventId = newEvent();
  await joinAs(page, "Alice", eventId);

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Pick a seat, Alice" }),
  ).toBeVisible();
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
