import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const brooksCaParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "brooks-ca")!
);
