import test from "node:test";
import assert from "node:assert/strict";

import {
  azerbaijanMapLocations,
  carrierLocationOptions,
  resolveLocationLabel,
} from "@/lib/azerbaijan-map-locations";

test("azerbaijanMapLocations contains predefined cities and coordinates", () => {
  assert.ok(azerbaijanMapLocations.length > 20);
  const baku = azerbaijanMapLocations.find((c) => c.label === "Bakı");
  assert.ok(baku);
  assert.equal(typeof baku.latitude, "number");
  assert.equal(typeof baku.longitude, "number");
});

test("carrierLocationOptions matches azerbaijanMapLocations", () => {
  assert.equal(carrierLocationOptions.length, azerbaijanMapLocations.length);
});

test("resolveLocationLabel falls back to nearest city when fetch fails or is mocked", async () => {
  // Mock global fetch returning error
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("error", { status: 500 });

  try {
    // Baku coordinates
    const labelBaku = await resolveLocationLabel(40.4092, 49.867);
    assert.equal(labelBaku, "Bakı");

    // Ganja coordinates
    const labelGanja = await resolveLocationLabel(40.6828, 46.3606);
    assert.equal(labelGanja, "Gəncə");

    // Sumqayit coordinates
    const labelSumqayit = await resolveLocationLabel(40.589, 49.668);
    assert.equal(labelSumqayit, "Sumqayıt");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolveLocationLabel uses API label when reverse geocode succeeds", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        data: { label: "Nərimanov rayonu", city: "Bakı" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    const label = await resolveLocationLabel(40.4092, 49.867);
    assert.equal(label, "Nərimanov rayonu");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
