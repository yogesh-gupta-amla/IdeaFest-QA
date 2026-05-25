import React from "react";
import ReactDOM from "react-dom/client";
import { AppProvider } from "./context/AppContext";
import App from "./App";
import AccessGuard from "./components/common/AccessGuard";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AccessGuard>
      <AppProvider>
        <App />
      </AppProvider>
    </AccessGuard>
  </React.StrictMode>,
);
