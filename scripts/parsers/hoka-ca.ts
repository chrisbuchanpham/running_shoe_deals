import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const hokaCaParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "hoka-ca")!
);
