import { Grid, GridItem, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import "./App.css";
import Board from "./components/Board";
import Champions from "./components/Champions";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import useTFT from "./hooks/useTFT";
import { findGreatest } from "./services/find";

function App() {
  const { data, error, loading } = useTFT();
  const [set, setSet] = useState("0");

  useEffect(() => {
    if (data?.sets === undefined) return;
    setSet(findGreatest(Object.keys(data?.sets)));
  }, [data]);

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
        <Navbar set={set} sets={Object.keys(data.sets)} setSet={setSet} />
      </GridItem>
      <GridItem gridArea="traits">
        <Text>Traits</Text>
      </GridItem>
      <GridItem gridArea="board">
        <Board />
      </GridItem>
      <GridItem gridArea="equipped">
        <Text>Equipped</Text>
      </GridItem>
      <GridItem gridArea="champions">
        <Champions champions={data.sets[set]?.champions} />
      </GridItem>
      <GridItem gridArea="items">
        <Text>Items</Text>
      </GridItem>
      <GridItem gridArea="footer">
        <Footer />
      </GridItem>
    </Grid>
  );
}

export default App;
