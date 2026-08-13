import { z } from "zod";
import { phoneSchema } from "@/lib/validations/auth";

const requiredText = (label: string) => z.string().min(1, `${label} mütləqdir.`);

export const vehicleSchema = z.object({
  vehicleType: requiredText("Avtomobilin növü"),
  brand: requiredText("Marka"),
  model: requiredText("Model"),
  plateNumber: requiredText("Dövlət nömrə nişanı"),
  driverFirstName: requiredText("Sürücünün adı"),
  driverLastName: requiredText("Sürücünün soyadı"),
  driverPhone: phoneSchema,
  capacityTons: z.coerce.number().positive("Tonnaj 0-dan böyük olmalıdır."),
  bodyLength: z.coerce.number().positive("Uzunluq 0-dan böyük olmalıdır."),
  bodyWidth: z.coerce.number().positive("En 0-dan böyük olmalıdır."),
  bodyHeight: z.coerce.number().positive("Hündürlük 0-dan böyük olmalıdır."),
  overallDimensions: requiredText("Ümumi qabarit ölçüləri"),
  workDays: z.array(z.string()).min(1, "Ən azı bir iş günü seçin."),
  workHours: requiredText("İşləmə saatları"),
  serviceAreas: z.array(z.string()).min(1, "Ən azı bir şəhər/rayon seçin."),
  imageUrls: z.array(z.string().url().or(z.string().startsWith("/"))).default([]),
  documentImageUrls: z.array(z.string().url().or(z.string().startsWith("/"))).default([])
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
