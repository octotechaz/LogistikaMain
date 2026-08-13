import type { DispatcherProfile, DriverProfile, Load, User } from "@prisma/client";

export function normalizePhoneForEmail(phone: string) {
  return phone.replace(/[^0-9]+/g, "") || crypto.randomUUID();
}

export function generatedRoleEmail(role: "driver" | "dispatcher", phone: string) {
  return `${role}-${normalizePhoneForEmail(phone)}@tranzit.local`;
}

export function formatPrice(load: Pick<Load, "priceFrom" | "priceTo" | "isNegotiable">) {
  if (load.isNegotiable) {
    return "Razılaşma ilə";
  }

  const from = load.priceFrom ? Number(load.priceFrom) : null;
  const to = load.priceTo ? Number(load.priceTo) : null;

  if (from && to) return `${from}-${to}`;
  if (from) return `${from}`;
  if (to) return `${to}`;
  return "Razılaşma ilə";
}

function formatMessagePrice(load: Pick<Load, "priceFrom" | "priceTo" | "isNegotiable">) {
  const price = formatPrice(load);
  return price === "Razılaşma ilə" ? price : `${price} AZN`;
}

export function buildOperatorWhatsappMessage(
  load: Pick<
    Load,
    "pickupCity" | "deliveryCity" | "title" | "weight" | "pickupDate" | "requiredVehicleType" | "priceFrom" | "priceTo" | "isNegotiable"
  >
) {
  return `Load offer:
${load.pickupCity} → ${load.deliveryCity}
Cargo: ${load.title}
Weight: ${load.weight} tons
Date: ${load.pickupDate.toISOString().slice(0, 10)}
Price: ${formatMessagePrice(load)}
Vehicle: ${load.requiredVehicleType}

Reply:
1 - I accept
2 - Not interested
3 - Price is low`;
}

export function buildOperatorSmsMessage(
  load: Pick<Load, "pickupCity" | "deliveryCity" | "title" | "weight" | "pickupDate" | "priceFrom" | "priceTo" | "isNegotiable">
) {
  return `YukTap: ${load.pickupCity}-${load.deliveryCity}, ${load.weight} tons ${load.title}, ${load.pickupDate
    .toISOString()
    .slice(0, 10)}, ${formatMessagePrice(load)}. Reply: 1 accept, 2 no, 3 price low.`;
}

export function buildWhatsappLink(phone: string, message: string) {
  const normalizedPhone = phone.replace(/[^0-9]+/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function driverMatchesLoad(
  driver: DriverProfile & { user: User },
  load: Pick<Load, "requiredVehicleType" | "weight" | "pickupCity" | "deliveryCity">
) {
  return (
    driver.status === "ACTIVE" &&
    driver.user.status === "ACTIVE" &&
    driver.vehicleType === load.requiredVehicleType &&
    driver.capacityTons >= load.weight &&
    (driver.routes.includes(load.pickupCity) || driver.routes.includes(load.deliveryCity))
  );
}

export function dispatcherMatchesLoad(
  dispatcher: DispatcherProfile & { user: User },
  load: Pick<Load, "requiredVehicleType" | "pickupCity" | "deliveryCity">
) {
  return (
    dispatcher.status === "ACTIVE" &&
    dispatcher.user.status === "ACTIVE" &&
    dispatcher.vehicleTypes.includes(load.requiredVehicleType) &&
    (dispatcher.routes.includes(load.pickupCity) || dispatcher.routes.includes(load.deliveryCity))
  );
}
