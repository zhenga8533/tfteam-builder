import { Box, Button, Heading, HStack, Menu, MenuButton, MenuItem, MenuList, useToast } from "@chakra-ui/react";
import { compressToEncodedURIComponent } from "lz-string";
import { BsChevronDown } from "react-icons/bs";
import { Unit } from "../hooks/useTFT";
import { decompressTeam } from "../services/format";

interface NavbarProps {
  set: string;
  sets: string[];
  setSet: (set: string) => void;
  team: (Unit | null)[][];
  setTeam: (team: (Unit | null)[][]) => void;
}

const Navbar = ({ set, sets, setSet, team, setTeam }: NavbarProps) => {
  const toast = useToast();

  const onClear = () => {
    setTeam(Array.from({ length: 4 }, () => Array(7).fill(null)));
    toast({
      title: "Team cleared",
      duration: 3_000,
      isClosable: true,
      position: "top",
      variant: "subtle",
    });
  };

  const onImport = () => {
    navigator.clipboard
      .readText()
      .then((clipboard) => {
        const index = clipboard.indexOf("team=");
        const compressed = index === -1 ? clipboard : clipboard.slice(index + 5);
        setTeam(decompressTeam(compressed));
        toast({
          title: "Team imported",
          duration: 3_000,
          isClosable: true,
          position: "top",
          variant: "subtle",
        });
      })
      .catch((error) => {
        toast({
          title: "Error reading clipboard",
          description: error.message,
          status: "error",
          duration: 3_000,
          isClosable: true,
          position: "top",
        });
      });
  };

  const onShare = () => {
    const compressed = compressToEncodedURIComponent(JSON.stringify(team));
    navigator.clipboard.writeText(window.location.href + `?team=${compressed}`);
    toast({
      title: "Team copied to clipboard",
      duration: 3_000,
      isClosable: true,
      position: "top",
      variant: "subtle",
    });
  };

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
        <Button onClick={onClear}>Clear</Button>
        <Button onClick={onImport}>Import</Button>
        <Button colorScheme="blue" onClick={onShare}>
          Share
        </Button>
      </HStack>
    </HStack>
  );
};

export default Navbar;
