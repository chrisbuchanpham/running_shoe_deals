import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const onRunningCaParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "on-running-ca")!
);
