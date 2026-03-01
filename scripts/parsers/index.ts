import { runningRoomParser } from "./running-room";
import { sportChekParser } from "./sport-chek";
import { mecParser } from "./mec";
import { altitudeSportsParser } from "./altitude-sports";
import { theLastHuntParser } from "./the-last-hunt";
import { blacktoeParser } from "./blacktoe";
import { solesParser } from "./soles";
import { nikeCaParser } from "./nike-ca";
import { adidasCaParser } from "./adidas-ca";
import { asicsCaParser } from "./asics-ca";
import { newBalanceCaParser } from "./new-balance-ca";
import { brooksCaParser } from "./brooks-ca";

export const parsers = [
  runningRoomParser,
  sportChekParser,
  mecParser,
  altitudeSportsParser,
  theLastHuntParser,
  blacktoeParser,
  solesParser,
  nikeCaParser,
  adidasCaParser,
  asicsCaParser,
  newBalanceCaParser,
  brooksCaParser
];
