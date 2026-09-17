import { ApplicationStatus } from "@prisma/client";
import { z } from "zod";

export const applicationCreateSchema = z.object({
  cargoPostId: z.string().min(1),
  vehicleId: z.string().min(1, "Avtomobil seçilməlidir."),
  message: z.string().max(800, "Mesaj maksimum 800 simvol ola bilər.").optional().or(z.literal("")),
  offeredPrice: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.coerce.number().nonnegative().optional()
  )
});

export const applicationDecisionSchema = z.object({
  status: z.union([z.literal(ApplicationStatus.ACCEPTED), z.literal(ApplicationStatus.REJECTED)])
});

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
