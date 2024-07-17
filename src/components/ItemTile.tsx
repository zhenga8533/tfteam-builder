import { Divider, HStack, Image, Text, Tooltip, VStack } from "@chakra-ui/react";
import { Item } from "../hooks/useTFT";
import { formatComponent, formatName, formatSkin, parseDescription } from "../services/format";
import ItemStats from "./ItemStats";

interface ItemTileProps {
  item: Item;
  hoverInfo: boolean;
  onDragStart: (item: Item) => void;
}

const ItemTile = ({ item, hoverInfo, onDragStart }: ItemTileProps) => {
  const label = (
    <VStack>
      <HStack>
        <Image boxSize="40px" src={formatSkin(item.icon)} />
        <Text fontWeight="bold">{formatName(item.name)}</Text>
      </HStack>
      <ItemStats effects={item.effects} />
      <Divider />
      <Text textAlign="center" dangerouslySetInnerHTML={{ __html: parseDescription(item.desc, item.effects) }} />
      <Divider />
      {item.composition.length > 0 ? (
        <HStack>
          <Text>Recipe:</Text>
          {item.composition.map((component, index) => (
            <Image
              key={component + index}
              boxSize="30px"
              src={formatComponent(component).replace("giants", "gaints")} // Fix typo
            />
          ))}
        </HStack>
      ) : (
        <Text>Uncraftable</Text>
      )}
    </VStack>
  );
  const tile = <Image src={formatSkin(item.icon)} alt={item.name} onDragStart={() => onDragStart(item)} />;

  if (!hoverInfo) return tile;
  return (
    <Tooltip background="gray.800" borderRadius={3} hasArrow py={2} textColor="white" label={label} placement="right">
      {tile}
    </Tooltip>
  );
};

export default ItemTile;
