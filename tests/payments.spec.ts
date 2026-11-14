import { expect, test } from "@playwright/test";
import { configure, joinAs, newEvent, newPage, seat } from "./helpers.ts";

test("paying for a hold books the seat", async ({ browser }) => {
  const eventId = newEvent();
  const alice = await newPage(browser);
  const bob = await newPage(browser);
  await joinAs(alice, "Alice", eventId);
  await joinAs(bob, "Bob", eventId);

  await seat(alice, "A1").click();
  await alice.getByRole("button", { name: "Pay" }).click();

  await expect(alice.getByRole("status")).toHaveText("You're booked into A1");
  await expect(seat(bob, "A1")).toHaveAccessibleName("A1 sold");

  // The booking comes from D1, so it's still there after a reload
  await alice.reload();
  await expect(alice.getByRole("list", { name: "My bookings" })).toHaveText(
    "A1",
  );
});

test("paying after the hold has expired is refused", async ({
  browser,
  request,
}) => {
  const eventId = newEvent();
  await configure(request, eventId, { paymentTimeoutSeconds: 1 });
  const alice = await newPage(browser);
  const bob = await newPage(browser);

  // Alice's seat map freezes, so her page still offers Pay after expiry
  await alice.routeWebSocket(/\/api\/events\/.*\/ws$/, (ws) => {
    const server = ws.connectToServer();
    let messages = 0;
    server.onMessage((message) => {
      if (messages++ < 2) ws.send(message); // initial map, then "A1 held"
    });
  });
  await joinAs(alice, "Alice", eventId);
  await joinAs(bob, "Bob", eventId);
  await seat(alice, "A1").click();
  await expect(seat(alice, "A1")).toHaveAccessibleName("A1 held");

  // Bob sees the workflow release the seat, then Alice tries to pay
  await expect(seat(bob, "A1")).toHaveAccessibleName("A1 available");
  await alice.getByRole("button", { name: "Pay" }).click();

  await expect(alice.getByRole("alert")).toHaveText("Your hold has expired");
});
