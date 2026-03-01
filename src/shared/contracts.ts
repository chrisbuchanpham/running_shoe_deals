import { z } from "zod";

export const genderSchema = z.enum(["men", "women", "unisex", "kids"]);
export const categorySchema = z.enum(["running", "trail"]);

export const retailerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  country: z.literal("CA"),
  currency: z.literal("CAD"),
  homepageUrl: z.string().url(),
  logoUrl: z.string().url(),
  shippingNotes: z.string().optional(),
  lastCrawledAt: z.string().datetime().optional()
});

export const offerSchema = z.object({
  id: z.string().min(1),
  retailerId: z.string().min(1),
  url: z.string().url(),
  titleRaw: z.string().min(1),
  brand: z.string().optional(),
  modelNormalized: z.string().min(1),
  gender: genderSchema.optional(),
  category: categorySchema,
  colorway: z.string().optional(),
  sizeRange: z.string().optional(),
  priceCurrent: z.number().nonnegative(),
  priceOriginal: z.number().nonnegative().optional(),
  discountPct: z.number().min(0).max(100).optional(),
  inStock: z.boolean(),
  scrapedAt: z.string().datetime(),
  sourceConfidence: z.number().min(0).max(1)
});

export const shoeCanonicalSchema = z.object({
  shoeId: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  category: categorySchema,
  aliases: z.array(z.string()),
  identifiers: z.object({
    sku: z.string().optional(),
    gtin: z.string().optional()
  }),
  matchRulesVersion: z.string().min(1)
});

export const dealCardSchema = z.object({
  shoeId: z.string().min(1),
  bestOfferId: z.string().min(1),
  bestPrice: z.number().nonnegative(),
  offersCount: z.number().int().positive(),
  maxDiscountPct: z.number().min(0).max(100).optional(),
  updatedAt: z.string().datetime()
});

export const parserHealthSchema = z.object({
  retailerId: z.string().min(1),
  status: z.enum(["ok", "disabled", "failed"]),
  offersCount: z.number().int().nonnegative(),
  warning: z.string().optional(),
  durationMs: z.number().int().nonnegative()
});

export const metadataSchema = z.object({
  generatedAt: z.string().datetime(),
  staleAfterHours: z.number().positive(),
  stale: z.boolean(),
  counts: z.object({
    retailers: z.number().int().nonnegative(),
    offers: z.number().int().nonnegative(),
    shoes: z.number().int().nonnegative(),
    deals: z.number().int().nonnegative()
  }),
  parserHealth: z.array(parserHealthSchema),
  warnings: z.array(z.string())
});

export const retailersFileSchema = z.array(retailerSchema);
export const offersFileSchema = z.array(offerSchema);
export const shoesFileSchema = z.array(shoeCanonicalSchema);
export const dealsFileSchema = z.array(dealCardSchema);

export type Retailer = z.infer<typeof retailerSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type ShoeCanonical = z.infer<typeof shoeCanonicalSchema>;
export type DealCard = z.infer<typeof dealCardSchema>;
export type ParserHealth = z.infer<typeof parserHealthSchema>;
export type Metadata = z.infer<typeof metadataSchema>;
