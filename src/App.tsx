import { Box, Grid, GridItem, Spinner, Text, useColorMode } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import "./App.css";
import Board from "./components/Board";
import Champions from "./components/Champions";
import Equipped from "./components/Equipped";
import Footer from "./components/Footer";
import Items from "./components/Items";
import Navbar from "./components/Navbar";
import Traits from "./components/Traits";
import useTFT, { Champion, Item, Trait, Unit } from "./hooks/useTFT";
import { findGreatest } from "./services/find";

function App() {
  const { setColorMode } = useColorMode();
  setColorMode("dark");

  const { data, error, loading } = useTFT();
  const [set, setSet] = useState("0");
  const [skins, setSkins] = useState(true);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [traits, setTraits] = useState<Trait[]>([]);

  const [team, setTeam] = useState<(Unit | null)[][]>(Array.from({ length: 4 }, () => Array(7).fill(null)));

  useEffect(() => {
    if (data?.sets === undefined) return;
    setSet(findGreatest(Object.keys(data?.sets)));
  }, [data]);

  useEffect(() => {
    setTeam(Array.from({ length: 4 }, () => Array(7).fill(null)));
    if (data === undefined) return;

    setChampions(
      data.sets[set].champions.sort((a, b) => {
        if (a.cost !== b.cost) return a.cost - b.cost;
        else return a.name.localeCompare(b.name);
      })
    );

    setItems(
      data.items
        .filter(
          (item) =>
            (item.apiName.startsWith("TFT_Item") || item.apiName.startsWith(`TFT${set}_Item`)) && // Remove old items
            !item.apiName.includes("Grant") && // Remove item anvils
            !item.apiName.includes("Debug") && // Remove developer items
            item.name && // Remove placeholder items
            (Object.keys(item.effects).length > 1 || item.desc.startsWith("The holder gains the")) // Remove components
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    setTraits(data.sets[set].traits);
  }, [set]);

  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const handleDragItem = (item: Item) => {
    setDraggedItem(item);
  };
  const handleDropItem = (rowIndex: number, colIndex: number) => {
    const newTeam = [...team];
    const tile = newTeam[rowIndex][colIndex];
    if (draggedItem === null || tile === null || tile.items.length === 3) return;

    tile.items.push(draggedItem);
    setTeam(newTeam);
    setDraggedItem(null);
  };

  if (loading)
    return (
      <Box w="100%" h="100vh" display="flex" justifyContent="center" alignItems="center">
        <Spinner size="xl" />
      </Box>
    );
  if (error) return <Text>Error: {error}</Text>;
  return (
    <Grid
      gap={6}
      templateAreas={{
        base: `"navbar navbar navbar"
               "board board board"
               "traits equipped items"
               "champions champions items"
               "footer footer footer"`,
        lg: `"navbar navbar navbar"
             "traits board equipped"
             "traits champions items"
             "footer footer footer"`,
      }}
      templateColumns="20% 60% 20%"
      w="100%"
    >
      <GridItem gridArea="navbar">
        <Navbar set={set} sets={Object.keys(data?.sets ?? [])} setSet={setSet} team={team} setTeam={setTeam} />
      </GridItem>
      <GridItem gridArea="traits">
        <Traits team={team} traits={traits} />
      </GridItem>
      <GridItem gridArea="board">
        <Board skins={skins} team={team} setTeam={setTeam} onDragItem={handleDragItem} onDropItem={handleDropItem} />
      </GridItem>
      <GridItem gridArea="equipped">
        <Equipped team={team} />
      </GridItem>
      <GridItem gridArea="champions">
        <Champions champions={champions} skins={skins} setSkins={setSkins} setTeam={setTeam} team={team} />
      </GridItem>
      <GridItem gridArea="items">
        <Items items={items} onDragStart={handleDragItem} />
      </GridItem>
      <GridItem gridArea="footer">
        <Footer />
      </GridItem>
    </Grid>
  );
}

export default App;
