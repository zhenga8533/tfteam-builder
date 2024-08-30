import { Divider, HStack, Image, Text, Tooltip, VStack } from "@chakra-ui/react";
import icon from "../assets/item.webp";
import { Item } from "../hooks/useTFT";
import { formatComponent, formatSkin, parseDescription } from "../services/format";
import ItemStats from "./ItemStats";

interface ItemTileProps {
  item: Item;
  hoverInfo: boolean;
  onClick: (item: Item) => void;
  onDragStart: (item: Item) => void;
}

const ItemTile = ({ item, hoverInfo, onClick, onDragStart }: ItemTileProps) => {
  const label = (
    <VStack>
      <HStack>
        <Image
          boxSize="40px"
          src={formatSkin(item.icon)}
          onError={(e) => ((e.target as HTMLImageElement).src = icon)}
        />
        <Text fontWeight="bold">{item.name}</Text>
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
              src={formatComponent(component)}
              onError={(e) => ((e.target as HTMLImageElement).src = icon)}
            />
          ))}
        </HStack>
      ) : (
        <Text>Uncraftable</Text>
      )}
    </VStack>
  );
  const tile = (
    <Image
      src={formatSkin(item.icon)}
      alt={item.name}
      onClick={() => onClick(item)}
      onDragStart={() => onDragStart(item)}
      draggable="true"
      onError={(e) => ((e.target as HTMLImageElement).src = icon)}
    />
  );

  if (!hoverInfo) return tile;
  return (
    <Tooltip background="gray.800" borderRadius={3} hasArrow py={2} textColor="white" label={label} placement="right">
      {tile}
    </Tooltip>
  );
};

export default ItemTile;
