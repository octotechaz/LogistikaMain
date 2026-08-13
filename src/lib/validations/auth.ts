
import { z } from "zod";
import { isValidInternationalPhone } from "@/lib/phone-validation";

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Telefon nömrəsi mütləqdir.")
  .refine((value) => isValidInternationalPhone(value), {
    message: "Telefon nömrəsi düzgün formatda deyil.",
  });

export const passwordSchema = z.string().min(8, "Şifrə minimum 8 simvol olmalıdır.");

const positiveNumberMessage = "Dəyər 0-dan böyük olmalıdır.";
const latitudeSchema = z.coerce.number().min(38, "Xəritədən düzgün mövqe seçin.").max(42.5, "Xəritədən düzgün mövqe seçin.");
const longitudeSchema = z.coerce.number().min(44, "Xəritədən düzgün mövqe seçin.").max(51.5, "Xəritədən düzgün mövqe seçin.");

const requiredText = (message: string) => z.string().trim().min(1, message);

const stringListSchema = z
  .union([z.array(z.string()), z.string()])
  .transform((value) =>
    Array.isArray(value)
      ? value.map((item) => item.trim()).filter(Boolean)
      : value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
  );

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır."),
  lastName: z.string().trim().min(2, "Soyad ən azı 2 simvol olmalıdır."),
  phone: phoneSchema,
  email: z.string().trim().email("Email düzgün deyil."),
  password: passwordSchema,
  role: z.string(),
  companyName: z.string().trim().optional().or(z.literal(""))
});

export const carrierRegisterSchema = registerSchema.extend({
  role: z.literal("CARRIER"),
  whatsappPhone: phoneSchema,
  vehicleType: requiredText("Avtomobil növünü seçin."),
  supportedCargoTypes: stringListSchema.refine(
    (value) => value.length > 0,
    "Daşıya bildiyiniz yük növlərindən ən azı birini seçin."
  ),
  cargoSpaceVolumeM3: z.coerce.number().positive(positiveNumberMessage),
  maxWeightTons: z.coerce.number().positive(positiveNumberMessage),
  locationAddress: requiredText("Yerləşmə ünvanını daxil edin."),
  locationLabel: requiredText("Xəritədən mövqe seçin."),
  locationLat: latitudeSchema,
  locationLng: longitudeSchema
});

export const cargoOwnerRegisterSchema = registerSchema
  .omit({ role: true })
  .extend({
    companyName: z.string().trim().optional().or(z.literal("")),
    voen: z.string().trim().optional().or(z.literal("")),
    city: z.string().trim().optional().or(z.literal(""))
  });

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email və ya telefon mütləqdir."),
  password: z.string().min(1, "Şifrə mütləqdir."),
  expectedRole: z.enum(["CARGO_OWNER", "CARRIER"]).optional()
});

export const forgotPasswordSendOtpSchema = z.object({
  identity: z.string().trim().min(1, "Email və ya telefon mütləqdir."),
});

export const forgotPasswordResetSchema = z.object({
  identity: z.string().trim().min(1, "Email və ya telefon mütləqdir."),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP 6 rəqəmli olmalıdır."),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Şifrə təsdiqi mütləqdir."),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Şifrələr uyğun gəlmir.",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CarrierRegisterInput = z.infer<typeof carrierRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
