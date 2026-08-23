import { z } from "zod";
import {
  normalizeNumericInput,
  quantityOrCompleteDimensionsMessage,
  quantityOrDimensionsRequiredMessage,
  quantityPositiveIntegerMessage,
  validateCargoMeasurements
} from "@/lib/cargo-measurements";
import {
  pickupDeadlineRequiredMessage,
  validatePickupDeadlineDateValue
} from "@/lib/pickup-deadline";
import { listingImageMaxFiles, listingImageMaxFilesMessage } from "@/lib/listing-images";
import { phoneSchema } from "@/lib/validations/auth";

const requiredText = (label: string) => z.string().trim().min(1, `${label} mütləqdir.`);
const requiredAddress = (message: string) => z.string().trim().min(1, message);

const optionalPositiveNumber = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return normalizeNumericInput(value);
  }

  return value;
}, z.coerce.number().positive("Dəyər 0-dan böyük olmalıdır.").optional());

const optionalDate = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) {
    return undefined;
  }

  return value;
}, z.coerce.date().optional());

export const cargoPostSchema = z
  .object({
    cargoName: requiredText("Yükün adı"),
    cargoType: requiredText("Yükün növü"),
    description: z.string().trim().min(10, "Təsvir ən azı 10 simvol olmalıdır."),
    weight: z.preprocess(
      (value) => (typeof value === "string" ? normalizeNumericInput(value) : value),
      z.coerce.number().positive("Çəki 0-dan böyük olmalıdır.")
    ),
    volume: optionalPositiveNumber,
    length: optionalPositiveNumber,
    width: optionalPositiveNumber,
    height: optionalPositiveNumber,
    quantity: z.string().trim().optional(),
    pickupAddress: requiredAddress("Yükləmə ünvanını daxil edin."),
    deliveryAddress: requiredAddress("Boşaltma ünvanını daxil edin."),
    pickupCity: requiredText("Yükləmə şəhəri/rayonu"),
    deliveryCity: requiredText("Boşaltma şəhəri/rayonu"),
    pickupDate: optionalDate,
    pickupDeadlineDate: z
      .string({ required_error: pickupDeadlineRequiredMessage })
      .trim()
      .min(1, pickupDeadlineRequiredMessage),
    requiredVehicleType: requiredText("Ehtimal olunan nəqliyyat növü"),
    proposedPrice: optionalPositiveNumber,
    priceNegotiable: z.coerce.boolean().default(false),
    contactPhone: phoneSchema,
    needsLoadingHelp: z.string().trim().optional(),
    needsUnloadingHelp: z.string().trim().optional(),
    requiresInvoice: z.string().trim().optional(),
    roundTrip: z.string().trim().optional(),
    legacyPickupTime: z.string().trim().optional(),
    legacyNote: z.string().trim().optional(),
    categoryId: z.string().trim().optional(),
    imageUrls: z
      .array(z.string().url().or(z.string().startsWith("/")))
      .max(listingImageMaxFiles, listingImageMaxFilesMessage)
      .default([])
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

    const pickupDeadlineError = validatePickupDeadlineDateValue(value.pickupDeadlineDate);

    if (pickupDeadlineError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pickupDeadlineDate"],
        message: pickupDeadlineError
      });
    }
  });

export type CargoPostInput = z.infer<typeof cargoPostSchema>;
