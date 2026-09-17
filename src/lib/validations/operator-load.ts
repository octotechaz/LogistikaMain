import { ContactChannel, ContactResponseStatus, LoadStatus } from "@prisma/client";
import { z } from "zod";
import {
  normalizeNumericInput,
  quantityOrCompleteDimensionsMessage,
  quantityOrDimensionsRequiredMessage,
  quantityPositiveIntegerMessage,
  validateCargoMeasurements
} from "@/lib/cargo-measurements";
import { phoneSchema } from "@/lib/validations/auth";

const numberField = z.preprocess(
  (value) => (typeof value === "string" ? normalizeNumericInput(value) : value),
  z.coerce.number().positive("Dəyər 0-dan böyük olmalıdır.")
);

const optionalNumberField = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return normalizeNumericInput(value);
  }

  return value;
}, z.coerce.number().positive("Dəyər 0-dan böyük olmalıdır.").nullable());

export const loadCreateSchema = z
  .object({
    title: z.string().trim().min(2, "Yük adı mütləqdir."),
    cargoType: z.string().trim().min(2, "Yük tipi mütləqdir."),
    description: z.string().trim().min(5, "Təsvir mütləqdir."),
    weight: numberField,
    volume: optionalNumberField,
    length: optionalNumberField,
    width: optionalNumberField,
    height: optionalNumberField,
    quantity: z.string().trim().optional().or(z.literal("")),
    pickupCity: z.string().trim().min(2, "Götürülmə şəhəri mütləqdir."),
    deliveryCity: z.string().trim().min(2, "Çatdırılma şəhəri mütləqdir."),
    pickupAddress: z.string().trim().min(2, "Götürülmə ünvanı mütləqdir."),
    deliveryAddress: z.string().trim().min(2, "Çatdırılma ünvanı mütləqdir."),
    pickupDate: z.coerce.date(),
    pickupTime: z.string().trim().optional().or(z.literal("")),
    requiredVehicleType: z.string().trim().min(2, "Tələb olunan maşın növü mütləqdir."),
    priceFrom: optionalNumberField,
    priceTo: optionalNumberField,
    isNegotiable: z.coerce.boolean().default(false),
    contactPhone: phoneSchema,
    note: z.string().trim().optional().or(z.literal(""))
  })
  .superRefine((value, context) => {
    const result = validateCargoMeasurements(value);

    if (result.quantityError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: quantityPositiveIntegerMessage
      });
    }

    if (!result.quantityValid && !result.volumeValid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message:
          result.hasAnyDimension && !result.hasAllDimensions
            ? quantityOrCompleteDimensionsMessage
            : quantityOrDimensionsRequiredMessage
      });
    }
  });

export const loadUpdateSchema = z.object({
  status: z.nativeEnum(LoadStatus).optional(),
  operatorNote: z.string().trim().optional(),
  operatorId: z.string().optional().nullable(),
  assignedDriverId: z.string().optional().nullable(),
  assignedDispatcherId: z.string().optional().nullable()
});

export const contactAttemptSchema = z.object({
  channel: z.nativeEnum(ContactChannel),
  responseStatus: z.nativeEnum(ContactResponseStatus).optional().nullable(),
  messageText: z.string().trim().min(2, "Mesaj mətni mütləqdir."),
  note: z.string().trim().optional().or(z.literal("")),
  driverId: z.string().optional().nullable(),
  dispatcherId: z.string().optional().nullable()
});

export type LoadCreateInput = z.infer<typeof loadCreateSchema>;
