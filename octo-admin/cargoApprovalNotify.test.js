"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildPendingCargoMessage } = require("./cargoApprovalNotify");

test("buildPendingCargoMessage: local admin links use http", () => {
  const message = buildPendingCargoMessage(
    {
      listingId: "abc",
      listingNumber: 100002,
      title: "Test",
      cargoType: "Mebel",
      pickupCity: "Bakı",
      deliveryCity: "Gəncə",
      contactPhone: "994501234567",
    },
    "admin.lvh.me:3005",
    "portal.lvh.me:3001"
  );

  assert.match(
    message,
    /http:\/\/admin\.lvh\.me:3005\/dashboard\/butun-elanlar\?elan=100002/
  );
  assert.match(message, /http:\/\/portal\.lvh\.me:3001\/loads\/abc/);
  assert.doesNotMatch(message, /https:\/\/admin\.lvh\.me/);
});
