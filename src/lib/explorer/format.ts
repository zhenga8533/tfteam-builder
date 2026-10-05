/**
 * Columnar binary format for the Explorer's boards: the sample (`explorer.bin`) and each champion's boards
 * (`explorer/{apiName}.bin`), gzipped on disk:
 *
 *   "TFTX" | u8 version | 3 bytes padding | u32 header length | header JSON | padding to 4 bytes
 *   then each section in `SECTIONS` order, each padded to 4 bytes.
 *
 * Names are stored once in the header; sections hold indices. Unit item slots store `index + 1`,
 * with 0 meaning empty. All indices fit a byte: sets have well under 255 units, items and traits.
 */

const MAGIC = "TFTX";
const VERSION = 2;
export const ITEM_SLOTS = 3;

export interface ExplorerHeader {
  /** Boards at this rank or above (see `ExplorerBoard.rank`) make up the default view; the rest serve other floors. */
  defaultRank: number;
  /**
   * Boards per rank on the whole patch, for a file holding every board of some kind (a champion's): shares are of
   * these rather than of the file's own boards. Absent for the sample, whose shares are of itself.
   */
  population?: number[];
  units: string[];
  items: string[];
  traits: string[];
  boards: number;
  unitRows: number;
  traitRows: number;
}

export interface ExplorerData extends ExplorerHeader {
  placement: Uint8Array;
  level: Uint8Array;
  rank: Uint8Array;
  /** Board b's units are rows `unitStart[b]` to `unitStart[b + 1]`. */
  unitStart: Uint32Array;
  traitStart: Uint32Array;
  unitIndex: Uint8Array;
  unitStar: Uint8Array;
  /** `ITEM_SLOTS` per unit row. */
  unitItems: Uint8Array;
  traitIndex: Uint8Array;
  traitMinUnits: Uint8Array;
}

type Section = Exclude<keyof ExplorerData, keyof ExplorerHeader>;

const SECTIONS: { name: Section; type: "u8" | "u32"; length: (h: ExplorerHeader) => number }[] = [
  { name: "unitStart", type: "u32", length: (h) => h.boards + 1 },
  { name: "traitStart", type: "u32", length: (h) => h.boards + 1 },
  { name: "placement", type: "u8", length: (h) => h.boards },
  { name: "level", type: "u8", length: (h) => h.boards },
  { name: "rank", type: "u8", length: (h) => h.boards },
  { name: "unitIndex", type: "u8", length: (h) => h.unitRows },
  { name: "unitStar", type: "u8", length: (h) => h.unitRows },
  { name: "unitItems", type: "u8", length: (h) => h.unitRows * ITEM_SLOTS },
  { name: "traitIndex", type: "u8", length: (h) => h.traitRows },
  { name: "traitMinUnits", type: "u8", length: (h) => h.traitRows },
];

const align = (offset: number) => Math.ceil(offset / 4) * 4;

export interface ExplorerBoard {
  placement: number;
  level: number;
  /** The rank tier the board counts toward, as an index into `RANK_BUCKETS` (0 = Master+); higher is lower. */
  rank?: number;
  units: { apiName: string; star: number; items: string[] }[];
  traits: { apiName: string; minUnits: number }[];
}

export function encodeExplorer(boards: ExplorerBoard[], defaultRank = 0, population?: number[]): Uint8Array {
  const dictionary = () => {
    const names: string[] = [];
    const indices = new Map<string, number>();
    const index = (name: string) => {
      let value = indices.get(name);
      if (value === undefined) indices.set(name, (value = names.push(name) - 1));
      if (value > 254) throw new Error("Explorer format supports at most 255 names per dictionary");
      return value;
    };
    return { names, index };
  };
  const units = dictionary();
  const items = dictionary();
  const traits = dictionary();

  const unitRows = boards.reduce((total, board) => total + board.units.length, 0);
  const traitRows = boards.reduce((total, board) => total + board.traits.length, 0);
  const data = {
    unitStart: new Uint32Array(boards.length + 1),
    traitStart: new Uint32Array(boards.length + 1),
    placement: new Uint8Array(boards.length),
    level: new Uint8Array(boards.length),
    rank: new Uint8Array(boards.length),
    unitIndex: new Uint8Array(unitRows),
    unitStar: new Uint8Array(unitRows),
    unitItems: new Uint8Array(unitRows * ITEM_SLOTS),
    traitIndex: new Uint8Array(traitRows),
    traitMinUnits: new Uint8Array(traitRows),
  } satisfies Record<Section, Uint8Array | Uint32Array>;

  let unitRow = 0;
  let traitRow = 0;
  boards.forEach((board, b) => {
    data.placement[b] = board.placement;
    data.level[b] = board.level;
    data.rank[b] = board.rank ?? 0;
    data.unitStart[b] = unitRow;
    data.traitStart[b] = traitRow;
    for (const unit of board.units) {
      data.unitIndex[unitRow] = units.index(unit.apiName);
      data.unitStar[unitRow] = unit.star;
      unit.items.slice(0, ITEM_SLOTS).forEach((item, slot) => {
        data.unitItems[unitRow * ITEM_SLOTS + slot] = items.index(item) + 1;
      });
      unitRow++;
    }
    for (const trait of board.traits) {
      data.traitIndex[traitRow] = traits.index(trait.apiName);
      data.traitMinUnits[traitRow] = trait.minUnits;
      traitRow++;
    }
  });
  data.unitStart[boards.length] = unitRow;
  data.traitStart[boards.length] = traitRow;

  const header: ExplorerHeader = {
    defaultRank,
    ...(population && { population }),
    units: units.names,
    items: items.names,
    traits: traits.names,
    boards: boards.length,
    unitRows,
    traitRows,
  };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  let offset = align(12 + headerBytes.length);
  const offsets = SECTIONS.map(({ name }) => {
    const start = offset;
    offset = align(offset + data[name].byteLength);
    return start;
  });

  const buffer = new Uint8Array(offset);
  buffer.set(new TextEncoder().encode(MAGIC), 0);
  buffer[4] = VERSION;
  new DataView(buffer.buffer).setUint32(8, headerBytes.length, true);
  buffer.set(headerBytes, 12);
  SECTIONS.forEach(({ name }, i) => {
    const section = data[name];
    buffer.set(new Uint8Array(section.buffer, section.byteOffset, section.byteLength), offsets[i]);
  });
  return buffer;
}

export function decodeExplorer(buffer: ArrayBuffer): ExplorerData {
  const bytes = new Uint8Array(buffer);
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== MAGIC || bytes[4] !== VERSION) {
    throw new Error("Unsupported explorer data format");
  }
  const headerLength = new DataView(buffer).getUint32(8, true);
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(12, 12 + headerLength))) as ExplorerHeader;

  let offset = align(12 + headerLength);
  const sections = {} as Record<Section, Uint8Array | Uint32Array>;
  for (const { name, type, length } of SECTIONS) {
    const count = length(header);
    sections[name] = type === "u32" ? new Uint32Array(buffer, offset, count) : new Uint8Array(buffer, offset, count);
    offset = align(offset + count * (type === "u32" ? 4 : 1));
  }
  return { ...header, ...(sections as Pick<ExplorerData, Section>) };
}
