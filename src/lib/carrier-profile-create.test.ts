import test from "node:test";
import assert from "node:assert/strict";

import { buildCarrierProfileCreateData } from "@/lib/carrier-profile-create";
import type { CarrierRegisterInput } from "@/lib/validations/auth";

const baseInput: CarrierRegisterInput = {
  firstName: "Murad",
  lastName: "Quliyev",
  phone: "+994501234567",
  whatsappPhone: "+994551234567",
  email: "murad@example.com",
  password: "Password123!",
  companyName: "Murad Logistics",
  role: "CARRIER",
  vehicleType: "TIR",
  supportedCargoTypes: ["Mebel", "Paletli yük"],
  cargoSpaceVolumeM3: 42.5,
  maxWeightTons: 18,
  locationAddress: "Bakı, Babək prospekti 24",
  locationLabel: "Bakı",
  locationLat: 40.409264,
  locationLng: 49.867092,
};

test("buildCarrierProfileCreateData maps every validated carrier field", () => {
  const data = buildCarrierProfileCreateData(baseInput);

  assert.equal(data.whatsappPhone, "+994551234567");
  assert.equal(data.vehicleType, "TIR");
  assert.deepEqual(data.supportedCargoTypes, ["Mebel", "Paletli yük"]);
  assert.equal(data.cargoSpaceVolumeM3, 42.5);
  assert.equal(data.maxWeightTons, 18);
  assert.equal(data.locationAddress, "Bakı, Babək prospekti 24");
  assert.equal(data.locationLabel, "Bakı");
  assert.equal(data.locationLat, 40.409264);
  assert.equal(data.locationLng, 49.867092);
});

test("buildCarrierProfileCreateData seeds rating to 0 without hardcoding on caller", () => {
  const data = buildCarrierProfileCreateData(baseInput);
  assert.equal(data.rating, 0);
});

test("buildCarrierProfileCreateData leaves bio undefined", () => {
  const data = buildCarrierProfileCreateData(baseInput);
  assert.equal(data.bio, undefined);
});
