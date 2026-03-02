import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0c972a" },
    secondary: { main: "#16A34A" },
    background: {
      default: "#F5F7FB",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0B1220",
      secondary: "#475467",
    },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial"].join(","),
    h4: { fontWeight: 850, letterSpacing: -0.8 },
    h5: { fontWeight: 850, letterSpacing: -0.6 },
    h6: { fontWeight: 800, letterSpacing: -0.3 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shadows: [
    "none",
    "0px 1px 2px rgba(16,24,40,0.06)",
    "0px 4px 12px rgba(16,24,40,0.08)",
    ...Array(22).fill("0px 10px 28px rgba(16,24,40,0.10)"),
  ] as any,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: "1px solid rgba(16,24,40,0.06)",
          boxShadow: "0px 12px 30px rgba(16,24,40,0.06)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 14, paddingInline: 16, paddingBlock: 10 },
        contained: { boxShadow: "0px 10px 20px rgba(30,94,255,0.20)" },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: { height: 3, borderRadius: 999 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 12,
        },
      },
    },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 700 },
      },
    },
  },
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}