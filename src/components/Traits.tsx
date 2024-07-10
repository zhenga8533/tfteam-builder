import { Divider, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { IoMdInformationCircle } from "react-icons/io";
import { Champion, Trait } from "../hooks/useTFT";

interface TraitsProps {
  team: (Champion | null)[][];
  traits: Trait[];
}

const Traits = ({ team, traits }: TraitsProps) => {
  const [activeTraits, setActiveTraits] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const teamTraits: { [key: string]: number } = {};

    team.forEach((row) => {
      row.forEach((champion) => {
        if (champion === null) return;

        champion.traits.forEach((trait) => {
          if (teamTraits[trait] === undefined) teamTraits[trait] = 0;
          teamTraits[trait]++;
        });
      });
    });

    setActiveTraits(teamTraits);
  }, [team]);

  return (
    <VStack backgroundColor="gray.700" p={3}>
      <Heading size="sm">Traits</Heading>
      <Divider />
      {Object.keys(activeTraits).length === 0 ? (
        <VStack color="gray.400" spacing={0}>
          <IoMdInformationCircle size={24} />
          <Text>No active synergies</Text>
        </VStack>
      ) : (
        Object.entries(activeTraits).map(([trait, count]) => (
          <VStack key={trait} spacing={0}>
            <Text>
              {trait} ({count})
            </Text>
          </VStack>
        ))
      )}
    </VStack>
  );
};

export default Traits;
