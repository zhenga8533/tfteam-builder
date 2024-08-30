import { Divider, Heading, HStack, Switch, Text, VStack } from "@chakra-ui/react";
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
  const [showPartial, setShowPartial] = useState(true);

  useEffect(() => {
    const teamTraits: {
      [key: string]: ActiveTrait;
    } = {};
    const trackedUnits: string[] = [];

    // Loop through the team and count the number of units for each trait
    team.forEach((row) => {
      row.forEach((champion) => {
        if (champion === null) return;
        if (trackedUnits.includes(champion.name)) return;
        trackedUnits.push(champion.name);

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

    // Sort the traits by the number of units and if they are active
    const active = Object.entries(teamTraits)
      .filter(([_, data]) => data.units >= data.effects[0].minUnits)
      .sort((a, b) => b[1].units - a[1].units);
    const inactive = Object.entries(teamTraits)
      .filter(([_, data]) => data.units < data.effects[0].minUnits)
      .sort((a, b) => b[1].units - a[1].units);

    setActiveTraits(Object.fromEntries(active.concat(inactive)));
  }, [team]);

  return (
    <VStack align="left" backgroundColor="gray.700" p={3}>
      <HStack my={1} justifyContent="space-between" px={5}>
        <Heading size="sm">Traits</Heading>
        <HStack>
          <Text color="gray.400">Partial</Text>
          <Switch isChecked={showPartial} onChange={() => setShowPartial(!showPartial)} />
        </HStack>
      </HStack>
      {Object.keys(activeTraits).length === 0 ||
      (!showPartial && Object.values(activeTraits).every((trait) => trait.units < trait.effects[0].minUnits)) ? (
        <>
          <Divider />
          <VStack color="gray.400" spacing={0}>
            <IoMdInformationCircle size={24} />
            <Text>No active synergies</Text>
          </VStack>
        </>
      ) : (
        Object.entries(activeTraits).map(([trait, data]) =>
          showPartial || data.units >= data.effects[0].minUnits ? (
            <Fragment key={trait}>
              <Divider />
              <TraitTile data={data} trait={trait} />
            </Fragment>
          ) : null
        )
      )}
    </VStack>
  );
};

export default Traits;
