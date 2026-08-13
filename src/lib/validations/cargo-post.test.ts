import test from "node:test";
import assert from "node:assert/strict";
import { cargoPostSchema } from "@/lib/validations/cargo-post";
import { listingImageMaxFiles } from "@/lib/listing-images";

function createValidPayload() {
  return {
    cargoName: "Paletli yük",
    cargoType: "Ümumi yük",
    description: "Daşınma üçün hazır vəziyyətdə olan paletli yük.",
    weight: "12",
    quantity: "20",
    pickupAddress: "Bakı, Babək prospekti 24",
    deliveryAddress: "Gəncə, Nizami küçəsi 18",
    pickupCity: "Bakı",
    deliveryCity: "Gəncə",
    pickupDeadlineDate: new Date(Date.now() + 864000000).toISOString().split("T")[0],
    requiredVehicleType: "TIR",
    proposedPrice: "1200",
    priceNegotiable: false,
    contactPhone: "+994501234567",
    imageUrls: [] as string[]
  };
}

test("cargo post schema accepts up to 10 listing images", () => {
  const payload = createValidPayload();
  payload.imageUrls = Array.from({ length: listingImageMaxFiles }, (_, index) => `/uploads/cargo-posts/${index + 1}.jpg`);

  const result = cargoPostSchema.parse(payload);

  assert.equal(result.imageUrls.length, listingImageMaxFiles);
});

test("cargo post schema rejects more than 10 listing images", () => {
  const payload = createValidPayload();
  payload.imageUrls = Array.from({ length: listingImageMaxFiles + 1 }, (_, index) => `/uploads/cargo-posts/${index + 1}.jpg`);

  assert.throws(() => cargoPostSchema.parse(payload));
});
