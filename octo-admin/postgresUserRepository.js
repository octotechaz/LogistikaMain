"use strict";

const bcrypt = require("bcryptjs");

const ROLE_MAP = {
  CARGO_OWNER: "USER",
};

// Maps legacy role -> canonical Role enum value
const LEGACY_TO_CANONICAL = {
  USER:       "CARGO_OWNER",
  ADMIN:      "ADMIN",
  CARRIER:    "CARRIER",
  DRIVER:     "DRIVER",
  DISPATCHER: "DISPATCHER",
};

const SUPPORTED_LEGACY_ROLES = new Set(Object.keys(LEGACY_TO_CANONICAL));

function mapRole(role) {
  return ROLE_MAP[role] ?? role;
}

function splitName(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("name must not be empty");
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, idx), lastName: trimmed.slice(idx + 1) };
}

function toDto(row) {
  const lastName = row.lastName || "";
  const name = lastName
    ? `${row.firstName} ${lastName}`
    : row.firstName || "";

  return {
    id:              row.id,
    name:            name.trim(),
    email:           row.email,
    phone:           row.phone,
    password:        row.passwordHash,
    role:            mapRole(row.role),
    profile_picture: row.profileImage ?? null,
    created_at:      row.createdAt,
  };
}

function makeUserRepository(prisma) {
  return {
    async findLoginUser(identifier) {
      if (/^\+?\d+$/.test(identifier)) {
        const canonicalPhone = identifier.startsWith("+") ? identifier.slice(1) : identifier;
        const phoneVariants = [canonicalPhone, `+${canonicalPhone}`];
        const rows = await prisma.user.findMany({
          where: { OR: phoneVariants.map((phone) => ({ phone })) },
          take: 2,
        });
        return rows.length === 1 ? toDto(rows[0]) : null;
      }

      const row = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { phone: identifier },
          ],
        },
      });
      return row ? toDto(row) : null;
    },

    async findSessionUser(id) {
      const row = await prisma.user.findUnique({
        where: { id },
      });
      return row ? toDto(row) : null;
    },

    async listUsers() {
      const rows = await prisma.user.findMany({
        orderBy: [{ createdAt: "desc" }],
      });
      return rows.map(toDto);
    },

    async verifyPassword(password, hash) {
      return bcrypt.compare(password, hash);
    },

    async findIdentityConflict({ email, phone, excludeId }) {
      const orClauses = [];
      if (email !== undefined) orClauses.push({ email });
      if (phone !== undefined) orClauses.push({ phone });
      const where = { OR: orClauses };
      if (excludeId !== undefined) {
        where.NOT = { id: excludeId };
      }
      return prisma.user.findFirst({ where });
    },

    async updateProfile({ id, name, email, phone, profileImage }) {
      const { firstName, lastName } = splitName(name);
      return prisma.$transaction(async (tx) => {
        const data = { firstName, lastName, email, phone };
        if (profileImage !== undefined) data.profileImage = profileImage;
        const row = await tx.user.update({ where: { id }, data });
        return toDto(row);
      });
    },

    async deleteUserWithCargos(id) {
      return prisma.$transaction(async (tx) => {
        await tx.user.delete({ where: { id } });
      });
    },

    async updateLegacyRole(id, legacyRole) {
      if (!SUPPORTED_LEGACY_ROLES.has(legacyRole)) {
        throw new Error(`Unsupported role: "${legacyRole}"`);
      }
      const canonicalRole = LEGACY_TO_CANONICAL[legacyRole];
      return prisma.$transaction(async (tx) => {
        const row = await tx.user.update({ where: { id }, data: { role: canonicalRole } });
        return toDto(row);
      });
    },

    async createLegacyUser({ name, email, phone, passwordHash, role, vehicleType, capacity }) {
      if (!SUPPORTED_LEGACY_ROLES.has(role)) {
        throw new Error(`Unsupported role: "${role}"`);
      }
      const canonicalRole = LEGACY_TO_CANONICAL[role];
      const { firstName, lastName } = splitName(name);

      return prisma.$transaction(async (tx) => {
        const userData = {
            firstName,
            lastName,
            email,
            phone,
            passwordHash,
            role: canonicalRole,
            status: "ACTIVE",
        };
        if (vehicleType !== undefined) userData.legacyVehicleType = vehicleType;
        if (capacity !== undefined) userData.legacyCapacity = capacity;
        const user = await tx.user.create({ data: userData });

        if (canonicalRole === "CARGO_OWNER") {
          await tx.cargoOwnerProfile.create({
            data: { userId: user.id },
          });
        }

        return toDto(user);
      });
    },
  };
}

module.exports = { makeUserRepository };
