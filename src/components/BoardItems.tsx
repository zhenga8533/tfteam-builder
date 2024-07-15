import { Box, Image } from "@chakra-ui/react";
import { Item } from "../hooks/useTFT";
import { formatSkin } from "../services/format";

interface BoardItemsProps {
  items: Item[];
}

const BoardItems = ({ items }: BoardItemsProps) => {
  return (
    <Box>
      {items.map((item, index) => (
        <Image
          key={index}
          src={formatSkin(item.icon)}
          alt={item.name}
          position="absolute"
          bottom={index % 2 === 0 ? "0" : "-10px"}
          boxSize="24px"
          left={`${32 * index - 4}px`}
          zIndex={1}
        />
      ))}
    </Box>
  );
};

export default BoardItems;
