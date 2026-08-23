import type { Prisma } from "@prisma/client";
import type { CarrierRegisterInput } from "@/lib/validations/auth";

export function buildCarrierProfileCreateData(
  input: CarrierRegisterInput
): Prisma.CarrierProfileCreateWithoutUserInput {
  return {
    whatsappPhone: input.whatsappPhone,
    vehicleType: input.vehicleType,
    supportedCargoTypes: input.supportedCargoTypes,
    cargoSpaceVolumeM3: input.cargoSpaceVolumeM3,
    maxWeightTons: input.maxWeightTons,
    locationAddress: input.locationAddress,
    locationLabel: input.locationLabel,
    locationLat: input.locationLat,
    locationLng: input.locationLng,
    rating: 0
  };
}
