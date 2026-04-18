import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { CG } from "./app/utils/crazygames";

// Initialize CrazyGames SDK before mounting the React app.
// CG.init() is a safe no-op on any non-CrazyGames domain.
CG.init().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
