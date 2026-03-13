import React from "react";
import "./bootstrap";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline } from "@mui/material";
import { AppThemeProvider } from "./theme/AppThemeProvider";
import { App } from "./routes/App";

const qc = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
    mutations: { retry: 0 },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppThemeProvider>
          <CssBaseline />
          <App />
        </AppThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
