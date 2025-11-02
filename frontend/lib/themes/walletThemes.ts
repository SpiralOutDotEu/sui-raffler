import { ThemeVars } from "@mysten/dapp-kit";

export const lightWalletTheme: ThemeVars = {
  blurs: {
    modalOverlay: "blur(0)",
  },
  backgroundColors: {
    primaryButton: "#F6F7F9",
    primaryButtonHover: "#F0F2F5",
    outlineButtonHover: "#F4F4F5",
    modalOverlay: "rgba(24 36 53 / 20%)",
    modalPrimary: "white",
    modalSecondary: "#F7F8F8",
    iconButton: "transparent",
    iconButtonHover: "#F0F1F2",
    dropdownMenu: "#FFFFFF",
    dropdownMenuSeparator: "#F3F6F8",
    walletItemSelected: "white",
    walletItemHover: "#3C424226",
  },
  borderColors: {
    outlineButton: "#E4E4E7",
  },
  colors: {
    primaryButton: "#373737",
    outlineButton: "#373737",
    iconButton: "#000000",
    body: "#182435",
    bodyMuted: "#767A81",
    bodyDanger: "#FF794B",
  },
  radii: {
    small: "6px",
    medium: "8px",
    large: "12px",
    xlarge: "16px",
  },
  shadows: {
    primaryButton: "0px 4px 12px rgba(0, 0, 0, 0.1)",
    walletItemSelected: "0px 2px 6px rgba(0, 0, 0, 0.05)",
  },
  fontWeights: {
    normal: "400",
    medium: "500",
    bold: "600",
  },
  fontSizes: {
    small: "14px",
    medium: "16px",
    large: "18px",
    xlarge: "20px",
  },
  typography: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    fontStyle: "normal",
    lineHeight: "1.3",
    letterSpacing: "1",
  },
};

export const darkWalletTheme: ThemeVars = {
  blurs: {
    modalOverlay: "blur(0)",
  },
  backgroundColors: {
    primaryButton: "#2d3748",
    primaryButtonHover: "#1a202c",
    outlineButtonHover: "#4a5568",
    modalOverlay: "rgba(0, 0, 0, 0.7)",
    modalPrimary: "#2d3748",
    modalSecondary: "#1a202c",
    iconButton: "transparent",
    iconButtonHover: "#4a5568",
    dropdownMenu: "#2d3748",
    dropdownMenuSeparator: "#4a5568",
    walletItemSelected: "#2d3748",
    walletItemHover: "rgba(255, 255, 255, 0.1)",
  },
  borderColors: {
    outlineButton: "#4a5568",
  },
  colors: {
    primaryButton: "#ffffff",
    outlineButton: "#ffffff",
    iconButton: "#ffffff",
    body: "#ffffff",
    bodyMuted: "#a0aec0",
    bodyDanger: "#fc8181",
  },
  radii: {
    small: "6px",
    medium: "8px",
    large: "12px",
    xlarge: "16px",
  },
  shadows: {
    primaryButton: "0px 4px 12px rgba(0, 0, 0, 0.3)",
    walletItemSelected: "0px 2px 6px rgba(0, 0, 0, 0.2)",
  },
  fontWeights: {
    normal: "400",
    medium: "500",
    bold: "600",
  },
  fontSizes: {
    small: "14px",
    medium: "16px",
    large: "18px",
    xlarge: "20px",
  },
  typography: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    fontStyle: "normal",
    lineHeight: "1.3",
    letterSpacing: "1",
  },
};

