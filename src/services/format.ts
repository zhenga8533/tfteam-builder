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
