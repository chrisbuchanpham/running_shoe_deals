import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const altitudeSportsParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "altitude-sports")!
);
