import { RETAILERS } from "../config/retailers";
import { createRetailerParser } from "./factory";

export const runningRoomParser = createRetailerParser(
  RETAILERS.find((retailer) => retailer.id === "running-room")!
);
