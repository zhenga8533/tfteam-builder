import { Box, Button, Heading, HStack, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react";
import { compressToEncodedURIComponent } from "lz-string";
import { BsChevronDown } from "react-icons/bs";
import { Champion } from "../hooks/useTFT";
import { decompressTeam } from "../services/format";

interface NavbarProps {
  set: string;
  sets: string[];
  setSet: (set: string) => void;
  team: (Champion | null)[][];
  setTeam: (team: (Champion | null)[][]) => void;
}

const Navbar = ({ set, sets, setSet, team, setTeam }: NavbarProps) => {
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
        <Button onClick={() => setTeam(Array.from({ length: 4 }, () => Array(7).fill(null)))}>Clear</Button>
        <Button
          onClick={() => {
            navigator.clipboard
              .readText()
              .then((clipboard) => {
                const index = clipboard.indexOf("team=");
                const compressed = index === -1 ? clipboard : clipboard.slice(index + 5);
                setTeam(decompressTeam(compressed));
              })
              .catch((error) => {
                console.error(error);
              });
          }}
        >
          Import
        </Button>
        <Button
          colorScheme="blue"
          onClick={() => {
            const compressed = compressToEncodedURIComponent(JSON.stringify(team));
            navigator.clipboard.writeText(window.location.href + `?team=${compressed}`);
          }}
        >
          Share
        </Button>
      </HStack>
    </HStack>
  );
};

export default Navbar;
