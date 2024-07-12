import { Divider, HStack, Image, Text, Tooltip, VStack } from "@chakra-ui/react";
import { Fragment } from "react";
import { parseDescription } from "../services/format";
import { ActiveTrait } from "./Traits";

interface TraitTileProps {
  data: ActiveTrait;
  trait: string;
}

const TraitTile = ({ data, trait }: TraitTileProps) => {
  const parseTrait = (desc: string) => {
    const lines: JSX.Element[] = [];
    const active = data.effects.findIndex((effect) => data.units >= effect.minUnits && data.units <= effect.maxUnits);
    let level = -1;

    desc.split("<br>").forEach((line, index) => {
      if (line.startsWith("<row>(@MinUnits@)")) level++;
      const effectLevel = Math.max(level, 0);
      const variables = data.effects[effectLevel].variables;
      variables["MinUnits"] = data.effects[effectLevel].minUnits;

      lines.push(
        <Text
          key={index}
          color={active !== -1 && active === level ? "white" : "gray.400"}
          fontWeight={active !== -1 && active === level ? "bold" : "normal"}
          textAlign="left"
          dangerouslySetInnerHTML={{ __html: parseDescription(line, data.effects[effectLevel].variables) }}
        />
      );
    });

    return lines;
  };

  return (
    <Tooltip
      background="gray.800"
      borderRadius={3}
      hasArrow
      placement="right"
      label={
        <VStack align="left" textColor="white" p={1} spacing={1}>
          <HStack>
            <Image src={data.icon} boxSize="28px" />
            <Text fontWeight="bold">{trait}</Text>
          </HStack>
          <Divider />
          {parseTrait(data.desc)}
        </VStack>
      }
    >
      <HStack ml={2}>
        <HStack spacing={1}>
          <Image src={data.icon} boxSize="28px" />
          <Text color="gray.400" fontWeight="bold">
            {data.units}
          </Text>
        </HStack>
        <VStack align="left" spacing={0}>
          <Text textAlign="left" fontWeight="bold">
            {trait}
          </Text>
          {data.units >= data.effects[0].minUnits ? (
            <Text textAlign="left" color="gray">
              <HStack spacing={1}>
                {data.effects.map((effect, index) => (
                  <Fragment key={effect.minUnits}>
                    <Text
                      color={data.units >= effect.minUnits && data.units <= effect.maxUnits ? "white" : "gray.400"}
                      fontWeight={data.units >= effect.minUnits && data.units <= effect.maxUnits ? "bold" : "normal"}
                    >
                      {effect.minUnits}
                    </Text>
                    {index < data.effects.length - 1 && (
                      <Text color="gray.400" fontSize={10}>
                        {"﹥"}
                      </Text>
                    )}
                  </Fragment>
                ))}
              </HStack>
            </Text>
          ) : (
            <Text textAlign="left" color="gray.400">
              {data.units} / {data.effects[0].minUnits}
            </Text>
          )}
        </VStack>
      </HStack>
    </Tooltip>
  );
};

export default TraitTile;
