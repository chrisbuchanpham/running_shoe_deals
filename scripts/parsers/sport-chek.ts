import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const sportChekParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "sport-chek")!
);
