import { expect, type Browser, type Page } from "@playwright/test";

// A fresh event per test gets its own EventSale Durable Object
export const newEvent = () => `test-${crypto.randomUUID()}`;

// Each buyer gets their own browser context, like a separate phone
export const newPage = async (browser: Browser) =>
  (await browser.newContext()).newPage();

export async function joinAs(page: Page, nickname: string, eventId: string) {
  await page.goto(`/?event=${eventId}`);
  await page.getByLabel("Nickname").fill(nickname);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: `Pick a seat, ${nickname}` }),
  ).toBeVisible();
}

// A seat's accessible name is "<id> <status>", e.g. "A1 held"
export const seat = (page: Page, seatId: string) =>
  page
    .getByRole("list", { name: "Seat map" })
    .getByRole("button", { name: new RegExp(`^${seatId} `) });
