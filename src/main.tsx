import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { CG } from "./app/utils/crazygames";

// Initialize CrazyGames SDK before mounting the React app.
// CG.init() is a safe no-op on any non-CrazyGames domain.
// Always mount React — even if the SDK rejects (e.g. sdkDisabled on non-CG domains).
const mount = () => createRoot(document.getElementById("root")!).render(<App />);
CG.init().then(mount, mount);

// Swallow uncaught SDK errors so they don't crash the page on non-CG domains.
window.addEventListener('unhandledrejection', (e) => {
  const msg = String((e.reason as { message?: string })?.message ?? e.reason);
  if (/sdkDisabled|CrazySDK/i.test(msg)) e.preventDefault();
});
window.addEventListener('error', (e) => {
  if (/sdkDisabled|CrazySDK/i.test(e.message || '')) e.preventDefault();
});
