import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f5b3b" },
    secondary: { main: "#d7a84a" },
    background: {
      default: "#f2f1ec",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#142033",
      secondary: "#5d6778",
    },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: ["Manrope", "system-ui", "-apple-system", "Segoe UI", "sans-serif"].join(","),
    h4: { fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.06 },
    h5: { fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 },
    h6: { fontWeight: 780, letterSpacing: -0.5, lineHeight: 1.12 },
    body1: { fontSize: 15, lineHeight: 1.6 },
    body2: { fontSize: 13.5, lineHeight: 1.55 },
    button: { textTransform: "none", fontWeight: 750, letterSpacing: -0.2 },
  },
  shadows: [
    "none",
    "0px 2px 6px rgba(20,32,51,0.05)",
    "0px 8px 18px rgba(20,32,51,0.08)",
    ...Array(22).fill("0px 18px 44px rgba(20,32,51,0.08)"),
  ] as any,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: "light",
        },
        body: {
          background: "#f3f2ee",
        },
        "::selection": {
          backgroundColor: "rgba(19,106,67,0.18)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: "1px solid rgba(20,32,51,0.08)",
          boxShadow: "0px 22px 50px rgba(20,32,51,0.07)",
          backgroundImage: "none",
          backgroundColor: "#ffffff",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 14, paddingInline: 18, paddingBlock: 10 },
        contained: { boxShadow: "0px 14px 30px rgba(19,106,67,0.18)" },
        outlined: { borderColor: "rgba(20,32,51,0.12)" },
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
        root: { borderRadius: 14, fontWeight: 750 },
        filled: { backgroundColor: "rgba(20,32,51,0.06)" },
      },
    },
  },
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
