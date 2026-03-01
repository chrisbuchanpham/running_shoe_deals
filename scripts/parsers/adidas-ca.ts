import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const adidasCaParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "adidas-ca")!
);
