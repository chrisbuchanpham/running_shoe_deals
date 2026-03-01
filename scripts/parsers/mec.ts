import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const mecParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "mec")!
);
