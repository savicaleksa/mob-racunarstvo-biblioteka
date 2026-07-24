import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  type Theme as NavigationTheme,
} from "@react-navigation/native";
import {
  adaptNavigationTheme,
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from "react-native-paper";

/**
 * The app's visual identity: a library dressed in wood and leaves (ADR-0010's
 * Paper stack). Warm bark-brown is the primary (shelves, spines), leaf-green the
 * secondary (living, growing), over a parchment surface in light and an
 * espresso surface in dark.
 *
 * Both a light and a dark scheme are defined so the root layout can switch on
 * the OS `useColorScheme()` — without an explicit theme Paper always renders
 * MD3LightTheme, which is why dark mode never took before. The matching React
 * Navigation themes keep headers, tab bars, and screen backgrounds in step with
 * Paper's surfaces (they are separate theming systems).
 */

const lightColors: MD3Theme["colors"] = {
  ...MD3LightTheme.colors,
  primary: "#7B5836", // bark brown
  onPrimary: "#FFFFFF",
  primaryContainer: "#FFDCBE",
  onPrimaryContainer: "#2C1600",
  secondary: "#4E6B3B", // leaf green
  onSecondary: "#FFFFFF",
  secondaryContainer: "#CFF0B3",
  onSecondaryContainer: "#0D2000",
  tertiary: "#8A5324", // amber / worn leather
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#FFDCC1",
  onTertiaryContainer: "#301400",
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#410002",
  background: "#FFF8F4", // parchment
  onBackground: "#211A13",
  surface: "#FFF8F4",
  onSurface: "#211A13",
  surfaceVariant: "#F0E0D0",
  onSurfaceVariant: "#4F4539",
  outline: "#817567",
  outlineVariant: "#D3C4B4",
  inverseSurface: "#372F27",
  inverseOnSurface: "#FDEEE2",
  inversePrimary: "#EDBD8C",
  surfaceDisabled: "rgba(33, 26, 19, 0.12)",
  onSurfaceDisabled: "rgba(33, 26, 19, 0.38)",
  elevation: {
    level0: "transparent",
    level1: "#FBF0E4",
    level2: "#F9EBDB",
    level3: "#F6E5D1",
    level4: "#F5E3CE",
    level5: "#F3DFC8",
  },
};

const darkColors: MD3Theme["colors"] = {
  ...MD3DarkTheme.colors,
  primary: "#EDBD8C", // light wood
  onPrimary: "#472A0B",
  primaryContainer: "#614020",
  onPrimaryContainer: "#FFDCBE",
  secondary: "#B4D399", // light leaf
  onSecondary: "#213810",
  secondaryContainer: "#374F24",
  onSecondaryContainer: "#CFF0B3",
  tertiary: "#FFB77C",
  onTertiary: "#502500",
  tertiaryContainer: "#6C3B0E",
  onTertiaryContainer: "#FFDCC1",
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",
  background: "#191410", // espresso
  onBackground: "#EEE0D4",
  surface: "#191410",
  onSurface: "#EEE0D4",
  surfaceVariant: "#4F4539",
  onSurfaceVariant: "#D3C4B4",
  outline: "#9C8E7F",
  outlineVariant: "#4F4539",
  inverseSurface: "#EEE0D4",
  inverseOnSurface: "#372F27",
  inversePrimary: "#7B5836",
  surfaceDisabled: "rgba(238, 224, 212, 0.12)",
  onSurfaceDisabled: "rgba(238, 224, 212, 0.38)",
  elevation: {
    level0: "transparent",
    level1: "#211A13",
    level2: "#261E16",
    level3: "#2B2218",
    level4: "#2D241A",
    level5: "#31281D",
  },
};

export const LibraryLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: lightColors,
};

export const LibraryDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: darkColors,
};

// Derive React Navigation themes so their structure (fonts, etc.) stays valid,
// then paint their surfaces from the Paper palette so the native header, tab
// bar, and screen background match Paper's Cards and Surfaces exactly.
const { LightTheme: navLightBase, DarkTheme: navDarkBase } =
  adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
  });

export const LibraryNavigationLightTheme: NavigationTheme = {
  ...navLightBase,
  colors: {
    ...navLightBase.colors,
    primary: lightColors.primary,
    background: lightColors.background,
    card: lightColors.elevation.level2,
    text: lightColors.onSurface,
    border: lightColors.outlineVariant,
    notification: lightColors.error,
  },
};

export const LibraryNavigationDarkTheme: NavigationTheme = {
  ...navDarkBase,
  colors: {
    ...navDarkBase.colors,
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.elevation.level2,
    text: darkColors.onSurface,
    border: darkColors.outlineVariant,
    notification: darkColors.error,
  },
};
