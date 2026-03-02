import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const sauconyCaParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "saucony-ca")!
);
