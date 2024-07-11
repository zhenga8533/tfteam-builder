import { Divider, HStack, Image, Text, Tooltip, VStack } from "@chakra-ui/react";
import { Fragment } from "react";
import { parseDescription } from "../services/format";
import { ActiveTrait } from "./Traits";

interface TraitTileProps {
  data: ActiveTrait;
  trait: string;
}

const TraitTile = ({ data, trait }: TraitTileProps) => {
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
          {data.desc.split("<br>").map((line, index) => (
            <Text
              key={index}
              textAlign="left"
              color="gray.400"
              dangerouslySetInnerHTML={{ __html: parseDescription(line) }}
            />
          ))}
        </VStack>
      }
    >
      <HStack ml={3}>
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
                    {index < data.effects.length - 1 && <Text color="gray.400">{" > "}</Text>}
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
