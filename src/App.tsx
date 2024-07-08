import { Grid, GridItem, Text } from "@chakra-ui/react";
import "./App.css";
import Board from "./components/Board";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";

function App() {
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
        <Navbar />
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
        <Text>Champions</Text>
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
