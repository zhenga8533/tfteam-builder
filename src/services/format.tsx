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
export const parseDescription = (desc: string) => {
  const stat = /%i:scale([A-Za-z]+)%/g;
  const variable = /@.*?@/g;
  const duration = /([A-Za-z]+)?Duration/g;
  const modified = /Modified([A-Za-z]+)?/g;

  const parsed = desc
    .replace(stat, (_, p1) => "%" + p1)
    .replace(variable, "X")
    .replace(duration, "X")
    .replace(modified, "X");

  return parsed;
};
