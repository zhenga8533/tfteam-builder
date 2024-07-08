import { Box, Grid, Image, Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { useRef } from "react";
import { BsSearch } from "react-icons/bs";
import { Item } from "../hooks/useTFT";
import { formatSkin } from "../services/format";

interface ItemsProps {
  items: Item[];
  set: string;
}

const Items = ({ items, set }: ItemsProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const setItems = items.filter(
    (item) =>
      (item.apiName.startsWith("TFT_Item") || item.apiName.startsWith(`TFT${set}_Item`)) &&
      !item.apiName.includes("Grant") &&
      !item.apiName.includes("Debug") &&
      item.name
  );

  return (
    <Box background="gray.700" padding={3}>
      <InputGroup mb={2}>
        <InputLeftElement children={<BsSearch />} />
        <Input borderRadius={1} name="search" placeholder="Search by name..." ref={ref} variant="filled" />
      </InputGroup>
      <hr />
      <Grid gap={3} mt={3} templateColumns="repeat(auto-fill, minmax(26px, 1fr))">
        {setItems.map((item) => (
          <Image key={item.apiName} src={formatSkin(item.icon)} alt={item.name} />
        ))}
      </Grid>
    </Box>
  );
};

export default Items;
