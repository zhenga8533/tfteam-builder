import { Divider, HStack, Image, Text, Tooltip, VStack } from "@chakra-ui/react";
import { Fragment } from "react";
import { formatName, parseDescription } from "../services/format";
import Hexagon from "./Hexagon";
import { ActiveTrait } from "./Traits";

interface TraitTileProps {
  data: ActiveTrait;
  trait: string;
}

const TraitTile = ({ data, trait }: TraitTileProps) => {
  const lines: JSX.Element[] = [];
  const active = data.units >= data.effects[0].minUnits;
  const activeLevel = data.effects.findIndex(
    (effect) => data.units >= effect.minUnits && data.units <= effect.maxUnits
  );
  let level = -1;
  const tier = data.effects.findIndex((effect) => data.units >= effect.minUnits && data.units <= effect.maxUnits) + 1;

  data.desc.split("<br>").forEach((line, index) => {
    if (line.startsWith("<row>(@MinUnits@)")) level++;
    const effectLevel = Math.max(level, 0);
    const variables = data.effects[effectLevel].variables;
    variables["MinUnits"] = data.effects[effectLevel].minUnits;

    lines.push(
      <Text
        key={index}
        color={activeLevel !== -1 && activeLevel === level ? "white" : "gray.400"}
        fontWeight={activeLevel !== -1 && activeLevel === level ? "bold" : "normal"}
        textAlign="left"
        dangerouslySetInnerHTML={{ __html: parseDescription(line, data.effects[effectLevel].variables) }}
      />
    );
  });

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
            <Text fontWeight="bold">{formatName(trait)}</Text>
          </HStack>
          <Divider />
          {lines}
        </VStack>
      }
    >
      <HStack ml={2}>
        <HStack mr={2} spacing={1}>
          <Hexagon
            color={`tier.${Math.min(tier, 4)}`}
            size="40px"
            tile={<Image src={data.icon} boxSize="28px" position="relative" top="6px" left="6px" />}
          />
          <Text color={active ? `tier.${Math.min(tier, 4)}` : "gray.400"} fontWeight="bold">
            {data.units}
          </Text>
        </HStack>
        <VStack align="left" spacing={0}>
          <Text textAlign="left" color={active ? "white" : "gray.600"} fontWeight="bold">
            {formatName(trait)}
          </Text>
          {active ? (
            <Text textAlign="left">
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
            <Text textAlign="left" color="gray.500">
              {data.units} / {data.effects[0].minUnits}
            </Text>
          )}
        </VStack>
      </HStack>
    </Tooltip>
  );
};

export default TraitTile;
