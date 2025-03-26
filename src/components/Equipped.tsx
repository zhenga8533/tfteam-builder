import { Box, Divider, Grid, Heading, Image, Text, Tooltip, VStack } from "@chakra-ui/react";
import { IoMdInformationCircle } from "react-icons/io";
import icon from "../assets/placeholder.webp";
import { Unit } from "../hooks/useTFT";
import { formatComponent, formatItemName } from "../services/format";
import ItemTile from "./ItemTile";

interface EquippedProps {
  team: (Unit | null)[][];
}

const Equipped = ({ team }: EquippedProps) => {
  const units = team.flat().filter((unit) => unit !== null && unit.items.length > 0) as Unit[];
  const items = units.map((unit) => unit.items).flat();
  const components = items.reduce((acc: { [key: string]: number }, item) => {
    item.composition.forEach((component) => {
      acc[component] = (acc[component] || 0) + 1;
    });

    return acc;
  }, {});

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
        <VStack>
          <Grid gap={3} mt={3} templateColumns="repeat(auto-fill, minmax(26px, 1fr))">
            {items.map((item, index) => (
              <ItemTile
                key={item.apiName + index}
                item={item}
                hoverInfo={true}
                onClick={() => {}}
                onDragStart={() => {}}
              />
            ))}
          </Grid>
          <Divider />
          <Grid gap={3} mt={3} templateColumns="repeat(auto-fill, minmax(26px, 1fr))">
            {Object.keys(components).map((component, index) => (
              <Tooltip key={component} hasArrow label={formatItemName(component)} placement="top">
                <Box position="relative">
                  <Image
                    key={component + index}
                    src={formatComponent(component)}
                    onError={(e) => ((e.target as HTMLImageElement).src = icon)}
                  />
                  <Text position="absolute" fontWeight={500} bottom={-2.5} right={-1.5}>
                    x{components[component]}
                  </Text>
                </Box>
              </Tooltip>
            ))}
          </Grid>
        </VStack>
      )}
    </VStack>
  );
};

export default Equipped;
