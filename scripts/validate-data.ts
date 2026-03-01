import path from "node:path";
import { readJsonFile } from "./lib/files";
import {
  dealsFileSchema,
  metadataSchema,
  offersFileSchema,
  retailersFileSchema,
  shoesFileSchema
} from "../src/shared/contracts";

function dataPath(file: string): string {
  return path.resolve(process.cwd(), "public", "data", file);
}

async function run(): Promise<void> {
  const retailers = retailersFileSchema.parse(await readJsonFile(dataPath("retailers.json")));
  const offers = offersFileSchema.parse(await readJsonFile(dataPath("offers.json")));
  const shoes = shoesFileSchema.parse(await readJsonFile(dataPath("shoes.json")));
  const deals = dealsFileSchema.parse(await readJsonFile(dataPath("deals.json")));
  const metadata = metadataSchema.parse(await readJsonFile(dataPath("metadata.json")));

  const retailerIds = new Set(retailers.map((retailer) => retailer.id));
  const offerIds = new Set(offers.map((offer) => offer.id));
  const shoeIds = new Set(shoes.map((shoe) => shoe.shoeId));

  for (const offer of offers) {
    if (!retailerIds.has(offer.retailerId)) {
      throw new Error(`Offer ${offer.id} references missing retailer ${offer.retailerId}.`);
    }
  }

  for (const deal of deals) {
    if (!shoeIds.has(deal.shoeId)) {
      throw new Error(`Deal references missing shoe ${deal.shoeId}.`);
    }
    if (!offerIds.has(deal.bestOfferId)) {
      throw new Error(`Deal references missing best offer ${deal.bestOfferId}.`);
    }
  }

  if (metadata.counts.offers !== offers.length) {
    throw new Error("metadata.counts.offers does not match offers.json length.");
  }
  if (metadata.counts.shoes !== shoes.length) {
    throw new Error("metadata.counts.shoes does not match shoes.json length.");
  }
  if (metadata.counts.deals !== deals.length) {
    throw new Error("metadata.counts.deals does not match deals.json length.");
  }

  console.log(
    `[validate] ok: ${retailers.length} retailers, ${offers.length} offers, ${shoes.length} shoes, ${deals.length} deals`
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
