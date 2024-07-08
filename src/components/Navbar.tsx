import { Box, Button, Heading, HStack, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react";
import { BsChevronDown } from "react-icons/bs";

interface NavbarProps {
  set: string;
  sets: string[];
  setSet: (set: string) => void;
}

const Navbar = ({ set, sets, setSet }: NavbarProps) => {
  return (
    <HStack justifyContent="space-between">
      <HStack>
        <Heading size="md">TFT Team Builder</Heading>
        <Menu>
          <MenuButton as={Button} rightIcon={<BsChevronDown />}>
            <Box mr={3}>Set {set}</Box>
          </MenuButton>
          <MenuList>
            {sets.map((set) => (
              <MenuItem key={set} onClick={() => setSet(set)}>
                Set {set}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </HStack>
      <HStack>
        <Button>Clear</Button>
        <Button>Import</Button>
        <Button colorScheme="blue">Share</Button>
      </HStack>
    </HStack>
  );
};

export default Navbar;
