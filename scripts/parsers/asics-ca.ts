import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const asicsCaParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "asics-ca")!
);
