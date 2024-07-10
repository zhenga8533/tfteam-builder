import { Divider, Grid, GridItem, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
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
    <VStack backgroundColor="gray.700" p={3}>
      <Heading size="sm">Traits</Heading>
      <Divider />
      <Grid backgroundColor="gray.700" gap={3} templateColumns={"1fr 3fr"}>
        {Object.keys(activeTraits).length === 0 ? (
          <GridItem colSpan={2}>
            <VStack color="gray.400" spacing={0}>
              <IoMdInformationCircle size={24} />
              <Text>No active synergies</Text>
            </VStack>
          </GridItem>
        ) : (
          Object.entries(activeTraits).map(([trait, data]) => <TraitTile key={trait} data={data} trait={trait} />)
        )}
      </Grid>
    </VStack>
  );
};

export default Traits;
