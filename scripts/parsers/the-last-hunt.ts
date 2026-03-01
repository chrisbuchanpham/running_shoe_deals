import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const theLastHuntParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "the-last-hunt")!
);
