import { expect, test } from "@playwright/test";
import {
  configure,
  joinAs,
  newEvent,
  newPage,
  openDashboard,
  seat,
} from "./helpers.ts";

// Each test drives the dashboard's chaos controls, rehearsing the demo

test("a declined payment releases the seat for someone else", async ({
  browser,
}) => {
  const eventId = newEvent();
  const dashboard = await openDashboard(browser, eventId);
  const alice = await newPage(browser);
  const bob = await newPage(browser);
  await joinAs(alice, "Alice", eventId);
  await joinAs(bob, "Bob", eventId);

  await dashboard.getByRole("slider", { name: "Decline rate" }).fill("1");
  await expect(
    dashboard.getByRole("status", { name: "Decline rate" }),
  ).toHaveText("100%");

  await seat(alice, "A1").click();
  await expect(seat(bob, "A1")).toHaveAccessibleName("A1 held");
  await alice.getByRole("button", { name: "Pay" }).click();

  await expect(alice.getByRole("alert")).toHaveText(
    "Payment for A1 was declined",
  );
  await expect(seat(bob, "A1")).toHaveAccessibleName("A1 available");
  await expect(alice.getByRole("list", { name: "My bookings" })).toHaveCount(0);

  // Back to normal, and Bob gets the seat Alice lost
  await dashboard.getByRole("slider", { name: "Decline rate" }).fill("0");
  await expect(
    dashboard.getByRole("status", { name: "Decline rate" }),
  ).toHaveText("0%");
  await seat(bob, "A1").click();
  await bob.getByRole("button", { name: "Pay" }).click();
  await expect(bob.getByRole("status")).toHaveText("You're booked into A1");
});

test("the charge step retries through a flaky provider", async ({
  browser,
}) => {
  const eventId = newEvent();
  const dashboard = await openDashboard(browser, eventId);
  const alice = await newPage(browser);
  await joinAs(alice, "Alice", eventId);

  const leftToFail = dashboard.getByRole("status", {
    name: "Charges left to fail",
  });
  await dashboard.getByRole("button", { name: "Fail next 2 charges" }).click();
  await expect(leftToFail).toHaveText("2 to fail");

  await seat(alice, "A1").click();
  await alice.getByRole("button", { name: "Pay" }).click();

  // Two 503s, retried after 1s then 2s, and the third attempt goes through
  await expect(alice.getByRole("status")).toHaveText("You're booked into A1", {
    timeout: 10_000,
  });
  await expect(leftToFail).toHaveText("0 to fail");
  await expect(seat(dashboard, "A1")).toHaveAccessibleName("A1 sold");
});

test("a broken outbox delays the workflow, then the backlog drains", async ({
  browser,
  request,
}) => {
  const eventId = newEvent();
  // Keep the outbox's retries close together so the backlog drains quickly
  await configure(request, eventId, { outboxMaxBackoffSeconds: 1 });
  const dashboard = await openDashboard(browser, eventId);
  const alice = await newPage(browser);
  await joinAs(alice, "Alice", eventId);

  const breakOutbox = dashboard.getByRole("switch", { name: "Break outbox" });
  await breakOutbox.check();

  // The hold still commits: the DO doesn't depend on the workflow
  await seat(alice, "A1").click();
  await expect(seat(dashboard, "A1")).toHaveAccessibleName("A1 held");

  await alice.getByRole("button", { name: "Pay" }).click();

  // A payment normally takes about half a second. With the outbox broken,
  // neither the workflow start nor the pay event gets through.
  await alice.waitForTimeout(2_000);
  await expect(alice.getByText("Processing payment…")).toBeVisible();
  await expect(seat(dashboard, "A1")).toHaveAccessibleName("A1 held");

  // Fixing it doesn't touch the outbox. Its next retry just succeeds.
  await breakOutbox.uncheck();
  await expect(alice.getByRole("status")).toHaveText("You're booked into A1");
  await expect(seat(dashboard, "A1")).toHaveAccessibleName("A1 sold");
});
