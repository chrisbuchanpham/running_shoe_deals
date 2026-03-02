import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const salomonCaParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "salomon-ca")!
);
