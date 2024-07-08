import { Box, Button, Heading, HStack, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react";
import { BsChevronDown } from "react-icons/bs";

const Navbar = () => {
  return (
    <HStack justifyContent="space-between">
      <HStack>
        <Heading size="md">TFT Team Builder</Heading>
        <Menu>
          <MenuButton as={Button} rightIcon={<BsChevronDown />}>
            <Box mr={3}>Set X</Box>
          </MenuButton>
          <MenuList>
            {Array.from({ length: 5 }).map((_, index) => (
              <MenuItem key={`set-${index}`}>Set {index + 1}</MenuItem>
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
