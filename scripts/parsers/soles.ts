import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const solesParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "soles")!
);
