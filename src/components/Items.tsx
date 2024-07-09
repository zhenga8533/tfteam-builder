import {
  Box,
  Divider,
  Grid,
  HStack,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { BsSearch } from "react-icons/bs";
import { Item } from "../hooks/useTFT";
import { formatSkin, parseDescription } from "../services/format";

interface ItemsProps {
  items: Item[];
}

const Items = ({ items }: ItemsProps) => {
  const ref = useRef<HTMLInputElement>(null);

  const [filtered, setFiltered] = useState<Item[]>(items);
  const filterItems = (search: string) => {
    if (search === "") return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) || item.desc.toLowerCase().includes(search.toLowerCase())
    );
  };

  useEffect(() => {
    setFiltered(items);
    console.log(items);
  }, [items]);

  return (
    <Box background="gray.700" padding={3}>
      <InputGroup mb={2}>
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
      <hr />
      <Grid gap={3} mt={3} templateColumns="repeat(auto-fill, minmax(26px, 1fr))">
        {filtered.map((item) => (
          <Tooltip
            key={item.apiName}
            background="gray.800"
            borderRadius={3}
            hasArrow
            textColor="white"
            label={
              <VStack>
                <HStack>
                  <Image boxSize="40px" src={formatSkin(item.icon)} />
                  <Text fontWeight="bold">{item.name}</Text>
                </HStack>
                <Divider />
                <Text dangerouslySetInnerHTML={{ __html: parseDescription(item.desc) }} />
                <Divider />
                <HStack>
                  <Text>Components:</Text>
                  {item.composition.map((component) => (
                    <Image key={component} boxSize="20px" src={formatSkin(component)} />
                  ))}
                </HStack>
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
