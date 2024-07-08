import { Box, Grid, Image } from "@chakra-ui/react";
import { Item } from "../hooks/useTFT";
import { formatSkin } from "../services/format";

interface ItemsProps {
  items: Item[];
  set: string;
}

const Items = ({ items, set }: ItemsProps) => {
  const setItems = items.slice(0, 50);

  return (
    <Box background="gray.700">
      <Grid gap={3} padding={3} templateColumns="repeat(auto-fill, minmax(26px, 1fr))">
        {setItems.map((item) => (
          <Image key={item.id} src={formatSkin(item.icon)} />
        ))}
      </Grid>
    </Box>
  );
};

export default Items;
