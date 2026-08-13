import { z } from "zod";
import { phoneSchema } from "@/lib/validations/auth";

const positiveNumber = z.coerce.number().positive("Dəyər 0-dan böyük olmalıdır.");

const stringList = z
  .union([z.array(z.string()), z.string()])
  .transform((value) =>
    Array.isArray(value)
      ? value.map((item) => item.trim()).filter(Boolean)
      : value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
  )
  .refine((value) => value.length > 0, "Ən azı bir dəyər daxil edilməlidir.");

export const driverRegisterSchema = z.object({
  firstName: z.string().trim().min(2, "Ad mütləqdir."),
  lastName: z.string().trim().min(2, "Soyad mütləqdir."),
  phone: phoneSchema,
  whatsappPhone: phoneSchema,
  city: z.string().trim().min(2, "Şəhər/rayon mütləqdir."),
  vehicleType: z.string().trim().min(2, "Maşın növü mütləqdir."),
  brand: z.string().trim().min(1, "Marka mütləqdir."),
  model: z.string().trim().min(1, "Model mütləqdir."),
  plateNumber: z.string().trim().min(2, "Dövlət nömrəsi mütləqdir."),
  capacityTons: positiveNumber,
  bodyLength: positiveNumber,
  bodyWidth: positiveNumber,
  bodyHeight: positiveNumber,
  workingDays: stringList,
  workingHours: z.string().trim().min(2, "İş saatları mütləqdir."),
  routes: stringList,
  notificationChannels: stringList,
  consentToReceiveOffers: z.coerce
    .boolean()
    .refine((value) => value === true, "Yük təkliflərini qəbul etməyə razılıq mütləqdir.")
});

export const driverProfileUpdateSchema = driverRegisterSchema.partial().extend({
  consentToReceiveOffers: z.coerce.boolean().optional()
});

export const dispatcherRegisterSchema = z.object({
  firstName: z.string().trim().min(2, "Ad mütləqdir."),
  lastName: z.string().trim().min(2, "Soyad mütləqdir."),
  phone: phoneSchema,
  whatsappPhone: phoneSchema,
  companyName: z.string().trim().min(2, "Şirkət və ya komanda adı mütləqdir."),
  vehicleCount: z.coerce.number().int().positive("Maşın sayı 0-dan böyük olmalıdır."),
  vehicleTypes: stringList,
  routes: stringList,
  note: z.string().trim().optional().or(z.literal(""))
});

export const dispatcherProfileUpdateSchema = dispatcherRegisterSchema.partial();

export type DriverRegisterInput = z.infer<typeof driverRegisterSchema>;
export type DispatcherRegisterInput = z.infer<typeof dispatcherRegisterSchema>;
