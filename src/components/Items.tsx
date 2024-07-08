import { Grid, Image } from "@chakra-ui/react";
import { Item } from "../hooks/useTFT";
import { formatSkin } from "../services/format";

interface ItemsProps {
  items: Item[];
  set: string;
}

const Items = ({ items, set }: ItemsProps) => {
  const setItems = items.slice(0, 50);

  return (
    <Grid gap={3} m={3} templateColumns="repeat(auto-fill, minmax(30px, 1fr))">
      {setItems.map((item) => (
        <Image key={item.id} src={formatSkin(item.icon)} />
      ))}
    </Grid>
  );
};

export default Items;
