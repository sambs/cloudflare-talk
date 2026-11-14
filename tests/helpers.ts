import {
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test";
import type { SaleSettings } from "../src/shared/types.ts";

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

// Per-event settings, e.g. a short payment timeout so tests run fast
export async function configure(
  request: APIRequestContext,
  eventId: string,
  settings: Partial<SaleSettings>,
) {
  const res = await request.patch(`/api/events/${eventId}/settings`, {
    data: settings,
  });
  expect(res.ok()).toBe(true);
}
