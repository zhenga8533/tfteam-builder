import { HStack, Text } from "@chakra-ui/react";
import { decompressFromEncodedURIComponent } from "lz-string";
import { Trait } from "../hooks/useTFT";

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
    if (parsed.length === 4 && parsed.every((row: any) => row.length === 7)) return parsed;
    else return Array.from({ length: 4 }, () => Array(7).fill(null));
  } catch (error) {
    return Array.from({ length: 4 }, () => Array(7).fill(null));
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
    .toLowerCase();
  return `https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/standard/${standard}.png`;
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
  const stat = /%i:scale([A-Za-z]+)%/g;
  const variable = /@([^@]+)@/g;
  const duration = /([A-Za-z]+)?Duration/g;
  const modified = /Modified([A-Za-z]+)?/g;

  const parsed = desc
    .replace(stat, (_, p1) => "%" + p1)
    .replace(variable, (_, p1) => values?.[p1]?.toString() || "X")
    .replace(duration, "X")
    .replace(modified, "X");

  return parsed;
};

/**
 * Parses a TFT styled trait description.
 *
 * @param desc - The description to be parsed.
 * @param values - The values to be parsed.
 */
export const parseTrait = (desc: string, values: Trait["effects"], units: number) => {
  const level = values.findIndex((effect) => units >= effect.minUnits && units <= effect.maxUnits);
  const lines = desc.split("<br>");

  const parsed = lines.map((line, index) => {
    if (index < 2 || index > values.length + 1) {
      return <Text key={index} color="gray.400" dangerouslySetInnerHTML={{ __html: line }} />;
    } else {
      return (
        <HStack key={index}>
          <Text>{values[index - 2]?.minUnits} </Text>
          <Text
            color={level === index - 2 ? "white" : "gray.500"}
            fontWeight={level === index - 2 ? "bold" : "normal"}
            dangerouslySetInnerHTML={{ __html: line }}
          />
        </HStack>
      );
    }
  });

  return parsed;
};
