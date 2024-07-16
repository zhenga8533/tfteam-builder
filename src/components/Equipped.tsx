import { Divider, Heading, Text, VStack } from "@chakra-ui/react";
import { IoMdInformationCircle } from "react-icons/io";
import { Unit } from "../hooks/useTFT";

interface EquippedProps {
  team: (Unit | null)[][];
}

const Equipped = ({ team }: EquippedProps) => {
  const units = team.flat().filter((unit) => unit !== null && unit.items.length > 0) as Unit[];
  const items = units.map((unit) => unit.items.map((item) => item.name).join(", "));

  return (
    <VStack align="left" backgroundColor="gray.700" p={3}>
      <Heading my={1} size="sm">
        Items
      </Heading>
      <Divider />
      {items.length === 0 ? (
        <VStack color="gray.400" spacing={0}>
          <IoMdInformationCircle size={24} />
          <Text>No items equipped</Text>
        </VStack>
      ) : (
        <Text>{items}</Text>
      )}
    </VStack>
  );
};

export default Equipped;
