/**
 * The set an apiName belongs to, when it says: `TFT17_Aatrox` or `DA_17_Aatrox` are Set 17's. Shared names such as
 * `TFT_Item_InfinityEdge` belong to no set.
 */
export function setOfApiName(apiName: string): number | undefined {
  const set = apiName.match(/^(?:TFT|DA_)(\d+)_/i)?.[1];
  return set ? Number(set) : undefined;
}
