import type { Match } from "../store/types.ts";

/** A ranked match for tests: a winner with a 2-star Ahri holding two Blue Buffs, and a 6th place. */
export const match = (overrides: Partial<Match["info"]> = {}): Match => ({
  metadata: { match_id: "NA1_1" },
  info: {
    queue_id: 1100,
    game_version: "Version 16.19.713.4213 (Sep 24 2026/10:10:00) [PUBLIC] <Releases/16.19>",
    game_datetime: 1_790_000_000_000,
    tft_set_number: 18,
    tft_game_type: "standard",
    participants: [
      {
        placement: 1,
        level: 9,
        traits: [
          { name: "TFT18_Blossom", num_units: 5, tier_current: 2 },
          { name: "TFT18_Fae", num_units: 1, tier_current: 0 },
        ],
        units: [
          { character_id: "TFT18_Ahri", tier: 2, itemNames: ["TFT_Item_BlueBuff", "TFT_Item_BlueBuff"] },
          { character_id: "TFT18_Ahri", tier: 1 },
        ],
      },
      {
        placement: 6,
        level: 8,
        last_round: 27,
        companion: { content_ID: "ossia-1" },
        traits: [],
        units: [{ character_id: "TFT18_Ahri", tier: 1 }],
      },
    ],
    ...overrides,
  },
});
