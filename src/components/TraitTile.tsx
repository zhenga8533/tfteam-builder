import { HStack, Image, Text, VStack } from "@chakra-ui/react";
import { Fragment } from "react";
import { ActiveTrait } from "./Traits";

interface TraitTileProps {
  data: ActiveTrait;
  trait: string;
}

const TraitTile = ({ data, trait }: TraitTileProps) => {
  return (
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
  );
};

export default TraitTile;
