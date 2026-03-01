import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const newBalanceCaParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "new-balance-ca")!
);
