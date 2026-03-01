import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const blacktoeParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "blacktoe")!
);
