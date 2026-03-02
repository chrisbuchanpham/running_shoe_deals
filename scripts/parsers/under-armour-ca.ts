import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const underArmourCaParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "under-armour-ca")!
);
