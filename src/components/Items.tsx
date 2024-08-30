import { Box, Grid, HStack, Input, InputGroup, InputLeftElement, Switch, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { BsSearch } from "react-icons/bs";
import { Item } from "../hooks/useTFT";
import ItemTile from "./ItemTile";

interface ItemsProps {
  items: Item[];
  onClick: (item: Item) => void;
  onDragStart: (item: Item) => void;
}

const Items = ({ items, onClick, onDragStart }: ItemsProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const [craftable, setCraftable] = useState(false);

  const [filtered, setFiltered] = useState<Item[]>(items);
  const filterItems = (search: string) => {
    return items.filter(
      (item) =>
        (item.composition.length > 0 || !craftable) &&
        (item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.desc.toLowerCase().includes(search.toLowerCase()))
    );
  };

  useEffect(() => {
    setFiltered(filterItems(""));
  }, [craftable, items]);

  return (
    <Box background="gray.700" padding={3}>
      <InputGroup>
        <InputLeftElement children={<BsSearch />} />
        <Input
          borderRadius={1}
          name="search"
          onChange={() => setFiltered(filterItems(ref.current?.value || ""))}
          placeholder="Search by name..."
          ref={ref}
          variant="filled"
        />
      </InputGroup>
      <HStack my={1}>
        <Text color="gray.400">Craftable</Text>
        <Switch isChecked={craftable} onChange={() => setCraftable(!craftable)} />
      </HStack>
      <hr />
      <Grid gap={3} mt={3} templateColumns="repeat(auto-fill, minmax(26px, 1fr))">
        {filtered.map((item) => (
          <ItemTile key={item.apiName} item={item} hoverInfo={true} onClick={onClick} onDragStart={onDragStart} />
        ))}
      </Grid>
    </Box>
  );
};

export default Items;
