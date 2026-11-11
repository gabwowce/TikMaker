import { createRoot } from "react-dom/client";
import { CityGame } from "./CityGame";

// A small browser game made from the bulb → city clip's city: fly a paper
// plane through the streets at night and collect the lights.
// Open http://localhost:5173/game.html (npm run dev).
createRoot(document.getElementById("root")!).render(<CityGame />);
