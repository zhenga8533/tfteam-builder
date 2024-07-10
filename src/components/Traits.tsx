import { Divider, Heading, Text, VStack } from "@chakra-ui/react";
import { Fragment, useEffect, useState } from "react";
import { IoMdInformationCircle } from "react-icons/io";
import { Champion, Trait } from "../hooks/useTFT";
import { formatSkin } from "../services/format";
import TraitTile from "./TraitTile";

interface TraitsProps {
  team: (Champion | null)[][];
  traits: Trait[];
}

export interface ActiveTrait extends Trait {
  units: number;
}

const Traits = ({ team, traits }: TraitsProps) => {
  const [activeTraits, setActiveTraits] = useState<{
    [key: string]: ActiveTrait;
  }>({});

  useEffect(() => {
    const teamTraits: {
      [key: string]: ActiveTrait;
    } = {};

    team.forEach((row) => {
      row.forEach((champion) => {
        if (champion === null) return;

        champion.traits.forEach((trait) => {
          if (teamTraits[trait] === undefined) {
            const traitData = traits.find((t) => t.name === trait);
            if (traitData === undefined) return;

            teamTraits[trait] = {
              ...traitData,
              units: 0,
            };
            teamTraits[trait].icon = formatSkin(traitData.icon);
          }
          teamTraits[trait].units++;
        });
      });
    });

    setActiveTraits(teamTraits);
  }, [team]);

  return (
    <VStack align="left" backgroundColor="gray.700" p={3}>
      <Heading size="sm">Traits</Heading>
      {Object.keys(activeTraits).length === 0 ? (
        <>
          <Divider />
          <VStack color="gray.400" spacing={0}>
            <IoMdInformationCircle size={24} />
            <Text>No active synergies</Text>
          </VStack>
        </>
      ) : (
        Object.entries(activeTraits).map(([trait, data]) => (
          <Fragment key={trait}>
            <Divider />
            <TraitTile data={data} trait={trait} />
          </Fragment>
        ))
      )}
    </VStack>
  );
};

export default Traits;
