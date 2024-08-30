import { decompressFromEncodedURIComponent } from "lz-string";

/**
 * Converts an image to png.
 *
 * @param image - The image to be converted to png.
 * @returns - The image converted to png.
 */
export const convertToPng = (image: string) => {
  if (!image) return "";
  return image.toLowerCase().substring(0, image.lastIndexOf(".")) + ".png";
};

/**
 * Decompresses a team.
 *
 * @param data - The data to be decompressed.
 * @returns - The decompressed team.
 */
export const decompressTeam = (data: string) => {
  const decompData = decompressFromEncodedURIComponent(data);
  try {
    const parsed = JSON.parse(decompData);
    const team = parsed.team;
    if (team && team.length === 4 && team.every((row: any) => row.length === 7)) return parsed;
    else return null;
  } catch (error) {
    return null;
  }
};

/**
 * Formats a component to be displayed.
 *
 * @param component - The component to be formatted.
 * @returns - The formatted component.
 */
export const formatComponent = (component: string) => {
  const standard = component
    .split("_")
    .pop()
    ?.replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase()
    .replace("giants", "gaints"); // Fix typo in the image path
  return `https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/standard/${standard}.png`;
};

/**
 * Formats an item name.
 *
 * @param name - The name to be formatted.
 * @returns - The formatted name.
 */
export const formatItemName = (name: string) => {
  return name
    .split("_")
    .pop()
    ?.replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
};

/**
 * Formats a skin to be displayed.
 *
 * @param skin - The skin to be formatted.
 * @returns - The formatted skin.
 */
export const formatSkin = (skin: string) => {
  return "https://raw.communitydragon.org/latest/game/" + convertToPng(skin);
};

/**
 * Parses a TFT styled description.
 *
 * @param desc - The description to be parsed.
 * @returns - The parsed description.
 */
export const parseDescription = (desc: string, values?: { [key: string]: number }) => {
  const keyword = /<TFTKeyword>([A-Za-z]+)<\/TFTKeyword>/g;
  const stat = /%i:scale([A-Za-z]+)%/g;
  const percent = /@([^@]+)\*100@/g;
  const variable = /@([^@]+)@/g;
  const duration = /([A-Za-z]+)?Duration/g;
  const modified = /Modified([A-Za-z]+)?/g;

  const roundValue = (value: number | undefined, mult: number) => {
    if (value === undefined) return "X";
    return Math.round(value * mult).toString();
  };

  const parsed = desc
    .replace(keyword, (_, p1) => `<b>${p1}</b>`)
    .replace(stat, (_, p1) => `<i>${p1}</i>`)
    .replace(/<\/i><i>/g, "/")
    .replace(percent, (_, p1) => roundValue(values?.[p1], 100))
    .replace(variable, (_, p1) => roundValue(values?.[p1], 1))
    .replace(duration, "X")
    .replace(modified, "X");

  return parsed;
};
