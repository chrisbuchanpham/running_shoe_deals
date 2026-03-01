import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const nikeCaParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "nike-ca")!
);
