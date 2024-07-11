import {
  Box,
  Divider,
  Grid,
  HStack,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Switch,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { BsSearch } from "react-icons/bs";
import { Item } from "../hooks/useTFT";
import { formatComponent, formatSkin, parseDescription } from "../services/format";
import ItemStats from "./ItemStats";

interface ItemsProps {
  items: Item[];
}

const Items = ({ items }: ItemsProps) => {
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
          <Tooltip
            key={item.apiName}
            background="gray.800"
            borderRadius={3}
            hasArrow
            py={2}
            textColor="white"
            label={
              <VStack>
                <HStack>
                  <Image boxSize="40px" src={formatSkin(item.icon)} />
                  <Text fontWeight="bold">{item.name}</Text>
                </HStack>
                <ItemStats effects={item.effects} />
                <Divider />
                <Text
                  textAlign="center"
                  dangerouslySetInnerHTML={{ __html: parseDescription(item.desc, item.effects) }}
                />
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
            }
            placement="right"
          >
            <Image src={formatSkin(item.icon)} alt={item.name} />
          </Tooltip>
        ))}
      </Grid>
    </Box>
  );
};

export default Items;
