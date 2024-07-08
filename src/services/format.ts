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
