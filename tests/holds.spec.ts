import { expect, test } from "@playwright/test";
import { joinAs, newEvent, newPage, seat } from "./helpers.ts";

test("a held seat updates live for every buyer and the dashboard", async ({
  browser,
}) => {
  const eventId = newEvent();
  const alice = await newPage(browser);
  const bob = await newPage(browser);
  const dashboard = await newPage(browser);
  await joinAs(alice, "Alice", eventId);
  await joinAs(bob, "Bob", eventId);
  await dashboard.goto(`/dashboard.html?event=${eventId}`);
  await expect(seat(dashboard, "A1")).toHaveAccessibleName("A1 available");

  await seat(alice, "A1").click();

  await expect(alice.getByText("You're holding A1")).toBeVisible();
  await expect(seat(bob, "A1")).toHaveAccessibleName("A1 held");
  await expect(seat(bob, "A1")).toBeDisabled();
  await expect(seat(dashboard, "A1")).toHaveAccessibleName("A1 held");
});

test("the DO rejects a second hold, even from an out-of-date seat map", async ({
  browser,
}) => {
  const eventId = newEvent();
  const alice = await newPage(browser);
  const bob = await newPage(browser);

  // Bob's phone is lagging: it gets the first seat map, then no updates
  await bob.routeWebSocket(/\/api\/events\/.*\/ws$/, (ws) => {
    const server = ws.connectToServer();
    let messages = 0;
    server.onMessage((message) => {
      if (messages++ === 0) ws.send(message);
    });
  });

  await joinAs(alice, "Alice", eventId);
  await joinAs(bob, "Bob", eventId);
  await expect(seat(bob, "A1")).toHaveAccessibleName("A1 available");

  await seat(alice, "A1").click();
  await expect(alice.getByText("You're holding A1")).toBeVisible();

  // Bob still sees A1 as available and taps it
  await expect(seat(bob, "A1")).toHaveAccessibleName("A1 available");
  await seat(bob, "A1").click();

  await expect(bob.getByRole("alert")).toHaveText("Seat not available");
  await expect(bob.getByText("You're holding")).toHaveCount(0);
});

test("an unpaid hold is released when the payment window closes", async ({
  browser,
}) => {
  const eventId = newEvent("short-hold");
  const alice = await newPage(browser);
  const bob = await newPage(browser);
  await joinAs(alice, "Alice", eventId);
  await joinAs(bob, "Bob", eventId);

  await seat(alice, "A1").click();
  await expect(seat(bob, "A1")).toHaveAccessibleName("A1 held");

  // Alice never pays: the workflow's wait times out and it releases the seat
  await expect(seat(bob, "A1")).toHaveAccessibleName("A1 available", {
    timeout: 10_000,
  });
  await expect(alice.getByRole("alert")).toHaveText("Your hold on A1 expired");
  await expect(seat(alice, "A1")).toBeEnabled();
});
