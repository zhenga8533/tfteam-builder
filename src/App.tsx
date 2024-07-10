import { Grid, GridItem, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import "./App.css";
import Board from "./components/Board";
import Champions from "./components/Champions";
import Footer from "./components/Footer";
import Items from "./components/Items";
import Navbar from "./components/Navbar";
import Traits from "./components/Traits";
import useTFT, { Champion, Item, Trait } from "./hooks/useTFT";
import { findGreatest } from "./services/find";
import { decompressTeam } from "./services/format";

function App() {
  const { data, error, loading } = useTFT();
  const [set, setSet] = useState("0");
  const [skins, setSkins] = useState(true);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [traits, setTraits] = useState<Trait[]>([]);

  const [team, setTeam] = useState<(Champion | null)[][]>(Array.from({ length: 4 }, () => Array(7).fill(null)));

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const teamParam = queryParams.get("team");
    if (teamParam) setTeam(decompressTeam(teamParam));
  }, [window.location.search]);

  useEffect(() => {
    if (data?.sets === undefined) return;
    setSet(findGreatest(Object.keys(data?.sets)));
  }, [data]);

  useEffect(() => {
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
            !item.name?.includes("_") &&
            item.name && // Remove placeholder items
            (Object.keys(item.effects).length > 1 || item.desc.startsWith("The holder gains the")) // Remove components
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    setTraits(data.sets[set].traits);
    console.log(data.sets[set].traits);
  }, [set]);

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  if (data === undefined) return <Text>No data</Text>;
  return (
    <Grid
      gap={6}
      templateAreas={`"navbar navbar navbar"
                      "traits board equipped"
                      "traits champions items"
                      "footer footer footer"`}
      templateColumns="20% 60% 20%"
      w="100%"
    >
      <GridItem gridArea="navbar">
        <Navbar set={set} sets={Object.keys(data.sets)} setSet={setSet} team={team} setTeam={setTeam} />
      </GridItem>
      <GridItem gridArea="traits">
        <Traits team={team} traits={traits} />
      </GridItem>
      <GridItem gridArea="board">
        <Board skins={skins} team={team} setTeam={setTeam} />
      </GridItem>
      <GridItem gridArea="equipped">
        <Text>Equipped</Text>
      </GridItem>
      <GridItem gridArea="champions">
        <Champions champions={champions} skins={skins} setSkins={setSkins} setTeam={setTeam} team={team} />
      </GridItem>
      <GridItem gridArea="items">
        <Items items={items} />
      </GridItem>
      <GridItem gridArea="footer">
        <Footer />
      </GridItem>
    </Grid>
  );
}

export default App;
