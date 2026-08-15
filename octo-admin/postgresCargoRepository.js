"use strict";

const VALID_ADMIN_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);

// Maps CargoPost.legacyAdminStatus -> CargoPost.status (public visibility)
const STATUS_MAP = {
  APPROVED: "ACTIVE",
  PENDING:  "CANCELLED",
  REJECTED: "CANCELLED",
};

function resolvePostWhere(id) {
  const raw = String(id);
  if (/^\d+$/.test(raw)) {
    return { legacySqliteId: Number(raw) };
  }
  return { id: raw };
}

function makeCargoRepository(prisma) {
  function formatPrice(value) {
    if (value == null || value === "") return null;
    if (typeof value === "object" && typeof value.toString === "function") {
      return value.toString();
    }
    return String(value);
  }

  function toDto(row) {
    const owner = row.owner || {};
    const lastName = owner.lastName || "";
    const userName = lastName
      ? `${owner.firstName} ${lastName}`
      : owner.firstName || "";

    return {
      id:                   row.legacySqliteId != null ? String(row.legacySqliteId) : String(row.id),
      title:                row.cargoName,
      cargo_type:           row.cargoType,
      description:          row.description || "",
      weight:               row.weight,
      volume:               row.volume,
      length:               row.length,
      width:                row.width,
      height:               row.height,
      quantity:             row.quantity,
      loading_city:         row.pickupCity,
      loading_address:      row.pickupAddress || "",
      unloading_city:       row.deliveryCity,
      unloading_address:    row.deliveryAddress || "",
      pickup_date:          row.pickupDate || null,
      latest_pickup_date:   row.pickupDeadlineDate,
      loading_time:         row.legacyPickupTime || "",
      transport_type:       row.requiredVehicleType || "",
      price:                formatPrice(row.proposedPrice),
      phone:                row.contactPhone || owner.phone || "",
      notes:                row.legacyNote || "",
      needs_loading_help:   row.needsLoadingHelp,
      needs_unloading_help: row.needsUnloadingHelp,
      requires_invoice:     row.requiresInvoice,
      round_trip:           row.roundTrip,
      created_at:           row.createdAt,
      user_name:            userName,
      user_email:           owner.email,
      user_phone:           owner.phone || "",
      status:               row.legacyAdminStatus,
      images:               Array.isArray(row.images) ? row.images.map((img) => img.url).filter(Boolean) : [],
    };
  }

  const listInclude = { owner: true, images: true };

  return {
    async listForAdmin() {
      const rows = await prisma.cargoPost.findMany({
        orderBy: [{ createdAt: "desc" }],
        include: listInclude,
      });
      return rows.map(toDto);
    },

    async listForLegacyOwner(legacyUserId) {
      const rows = await prisma.cargoPost.findMany({
        where:   { owner: { legacySqliteId: Number(legacyUserId) } },
        orderBy: [{ createdAt: "desc" }],
        include: listInclude,
      });
      return rows.map(toDto);
    },

    async listForOwner(ownerId) {
      const rows = await prisma.cargoPost.findMany({
        where:   { ownerId },
        orderBy: [{ createdAt: "desc" }],
        include: listInclude,
      });
      return rows.map(toDto);
    },

    async updateAdminStatus(id, status) {
      if (!VALID_ADMIN_STATUSES.has(status)) {
        throw new Error(`Invalid admin status: "${status}". Must be PENDING, APPROVED, or REJECTED.`);
      }
      return prisma.$transaction(async (tx) => {
        const { count } = await tx.cargoPost.updateMany({
          where: resolvePostWhere(id),
          data:  { legacyAdminStatus: status, status: STATUS_MAP[status], deactivatedAt: null },
        });
        return count > 0;
      });
    },

    async deleteForAdmin(id) {
      return prisma.$transaction(async (tx) => {
        const { count } = await tx.cargoPost.deleteMany({
          where: resolvePostWhere(id),
        });
        return count > 0;
      });
    },

    async deleteForOwner(legacyId, ownerId) {
      return prisma.$transaction(async (tx) => {
        return tx.cargoPost.delete({
          where: { legacySqliteId: legacyId, ownerId },
        });
      });
    },

    async deleteForLegacyOwner(legacyCargoId, legacyUserId) {
      return prisma.$transaction(async (tx) => {
        const row = await tx.cargoPost.findFirst({
          where: {
            legacySqliteId: Number(legacyCargoId),
            owner: { legacySqliteId: Number(legacyUserId) },
          },
        });
        if (!row) return false;
        await tx.cargoPost.delete({ where: { id: row.id } });
        return true;
      });
    },

    async listForSessionOwner(sessionUserId) {
      const isNumeric = /^\d+$/.test(String(sessionUserId));
      if (isNumeric) {
        const rows = await prisma.cargoPost.findMany({
          where:   { owner: { legacySqliteId: Number(sessionUserId) } },
          orderBy: [{ createdAt: "desc" }],
          include: listInclude,
        });
        return rows.map(toDto);
      }
      const rows = await prisma.cargoPost.findMany({
        where:   { ownerId: sessionUserId },
        orderBy: [{ createdAt: "desc" }],
        include: listInclude,
      });
      return rows.map(toDto);
    },

    async deleteForSessionOwner(legacyCargoId, sessionUserId) {
      const isNumeric = /^\d+$/.test(String(sessionUserId));
      return prisma.$transaction(async (tx) => {
        const where = isNumeric
          ? { legacySqliteId: Number(legacyCargoId), owner: { legacySqliteId: Number(sessionUserId) } }
          : { legacySqliteId: Number(legacyCargoId), ownerId: sessionUserId };
        const row = await tx.cargoPost.findFirst({ where });
        if (!row) return false;
        await tx.cargoPost.delete({ where: { id: row.id } });
        return true;
      });
    },

    async createCargo(input) {
      const {
        ownerId, title, cargo_type, description, weight, quantity,
        volume, length, width, height, loading_city, loading_address,
        unloading_city, unloading_address, loading_date, latest_pickup_date,
        loading_time, transport_type, price, phone, notes,
        needs_loading_help, needs_unloading_help, requires_invoice, round_trip,
        imagePaths = [],
      } = input;

      return prisma.$transaction(async (tx) => {
        const profile = await tx.cargoOwnerProfile.findFirst({ where: { userId: ownerId } });
        if (!profile) {
          throw new Error(`CargoOwnerProfile not found for ownerId: ${ownerId}`);
        }

        const seqRows = await tx.$queryRaw`SELECT nextval('cargo_post_legacy_sqlite_id_seq') AS nextval`;
        const legacySqliteId = Number(seqRows[0].nextval);

        const pickupDate = loading_date
          ? new Date(loading_date)
          : new Date(latest_pickup_date);

        const computedVolume = (!volume && length && width && height)
          ? length * width * height
          : (volume ?? null);

        const cargo = await tx.cargoPost.create({
          data: {
            legacySqliteId,
            ownerId,
            cargoOwnerProfileId: profile.id,
            cargoName:           title,
            cargoType:           cargo_type,
            description:         description ?? "",
            weight:              Number(weight),
            volume:              computedVolume != null ? Number(computedVolume) : null,
            length:              length  != null ? Number(length)  : null,
            width:               width   != null ? Number(width)   : null,
            height:              height  != null ? Number(height)  : null,
            quantity:            quantity  ?? null,
            pickupAddress:       loading_address   ?? "",
            deliveryAddress:     unloading_address ?? "",
            pickupCity:          loading_city,
            deliveryCity:        unloading_city,
            pickupDate,
            pickupDeadlineDate:  latest_pickup_date ? new Date(latest_pickup_date) : null,
            requiredVehicleType: transport_type ?? "",
            proposedPrice:       price != null ? price : null,
            contactPhone:        phone,
            needsLoadingHelp:    needs_loading_help    ?? null,
            needsUnloadingHelp:  needs_unloading_help  ?? null,
            requiresInvoice:     requires_invoice      ?? null,
            roundTrip:           round_trip            ?? null,
            legacyPickupTime:    loading_time          ?? null,
            legacyNote:          notes                 ?? null,
            legacyAdminStatus:   "PENDING",
            status:              "CANCELLED",
          },
        });

        if (imagePaths.length > 0) {
          await tx.image.createMany({
            data: imagePaths.map((url) => ({
              url,
              category:    "CARGO",
              cargoPostId: cargo.id,
            })),
          });
        }

        return cargo;
      });
    },
  };
}

module.exports = { makeCargoRepository };
