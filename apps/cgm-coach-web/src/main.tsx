import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelloPage } from "./features/hello/hello-page";

function App() {
  return (
    <StrictMode>
      <HelloPage />
    </StrictMode>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
