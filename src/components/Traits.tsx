import { Divider, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { IoMdInformationCircle } from "react-icons/io";
import { Champion, Trait } from "../hooks/useTFT";

interface TraitsProps {
  team: (Champion | null)[][];
  traits: Trait[];
}

const Traits = ({ team, traits }: TraitsProps) => {
  const [activeTraits, setActiveTraits] = useState<string[]>([]);

  useEffect(() => {}, [team]);

  return (
    <VStack backgroundColor="gray.700" p={3}>
      <Heading size="sm">Traits</Heading>
      <Divider />
      {activeTraits.length === 0 ? (
        <VStack color="gray.400" spacing={0}>
          <IoMdInformationCircle size={24} />
          <Text>No active synergies</Text>
        </VStack>
      ) : null}
    </VStack>
  );
};

export default Traits;
