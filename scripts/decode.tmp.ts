import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { decodeExplorer } from "../src/lib/explorer/format.ts";
const buf = gunzipSync(
  readFileSync(
    "C:/Users/azheng/AppData/Local/Temp/claude/C--Users-azheng-Documents-Git-tfteam-builder/b64051d7-b8ea-491e-9e02-a08c22cb5f83/scratchpad/live-explorer.bin.gz",
  ),
);
const data = decodeExplorer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const counts = [0, 0, 0, 0, 0];
for (let i = 0; i < data.boards; i++) counts[data.rank[i]!]!++;
console.log("boards", data.boards, "by rank [master, diamond, emerald, plat, gold]:", counts);
const s = JSON.parse(
  readFileSync(
    "C:/Users/azheng/AppData/Local/Temp/claude/C--Users-azheng-Documents-Git-tfteam-builder/b64051d7-b8ea-491e-9e02-a08c22cb5f83/scratchpad/live-set18.json",
    "utf8",
  ),
);
console.log("stats:", s.rankFloor, s.matches, "ranks offered:", s.ranks, "patch", s.patch);
