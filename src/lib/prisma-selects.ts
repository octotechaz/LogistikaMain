import type { Prisma } from "@prisma/client";

export const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  role: true,
  companyName: true,
  profileImage: true,
  status: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;
