import test from "node:test";
import assert from "node:assert/strict";

import { carrierRegisterSchema } from "@/lib/validations/auth";

test("carrier register schema accepts full carrier payload", () => {
  const result = carrierRegisterSchema.parse({
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
    cargoSpaceVolumeM3: "42.5",
    maxWeightTons: "18",
    locationAddress: "Bakı, Babək prospekti 24",
    locationLabel: "Bakı",
    locationLat: "40.409264",
    locationLng: "49.867092"
  });

  assert.equal(result.role, "CARRIER");
  assert.equal(result.vehicleType, "TIR");
  assert.deepEqual(result.supportedCargoTypes, ["Mebel", "Paletli yük"]);
  assert.equal(result.cargoSpaceVolumeM3, 42.5);
  assert.equal(result.maxWeightTons, 18);
});

test("carrier register schema rejects empty supported cargo types", () => {
  assert.throws(() =>
    carrierRegisterSchema.parse({
      firstName: "Murad",
      lastName: "Quliyev",
      phone: "+994501234567",
      whatsappPhone: "+994551234567",
      email: "murad@example.com",
      password: "Password123!",
      companyName: "",
      role: "CARRIER",
      vehicleType: "TIR",
      supportedCargoTypes: [],
      cargoSpaceVolumeM3: "42.5",
      maxWeightTons: "18",
      locationAddress: "Bakı, Babək prospekti 24",
      locationLabel: "Bakı",
      locationLat: "40.409264",
      locationLng: "49.867092"
    })
  );
});
