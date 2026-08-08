// src/constants/theme.js

/*
|--------------------------------------------------------------------------
| OCCASION FINANCE MANAGER
| Global Design System
|--------------------------------------------------------------------------
| Font       : Inter
| Primary    : Navy Blue
| Background : Light Blue/Gray
| Cards      : White
| Income     : Green
| Expense    : Red
| Warning    : Orange
| Accent     : Purple
|--------------------------------------------------------------------------
*/

export const COLORS = {
  // ---------------------------------------------------------
  // BACKGROUND
  // ---------------------------------------------------------
  background: "#F7F9FC",
  surface: "#FFFFFF",

  // ---------------------------------------------------------
  // BRAND
  // ---------------------------------------------------------
  primary: "#123F91",
  primaryDark: "#0B2F73",
  primaryLight: "#EEF4FF",

  // ---------------------------------------------------------
  // TEXT
  // ---------------------------------------------------------
  text: "#10244A",
  textSecondary: "#52627A",
  textMuted: "#7B8AA3",

  // ---------------------------------------------------------
  // BORDERS
  // ---------------------------------------------------------
  border: "#DCE4EF",
  borderLight: "#E9EEF5",

  // ---------------------------------------------------------
  // FINANCIAL COLORS
  // ---------------------------------------------------------
  success: "#168A2A",
  successLight: "#EAF7ED",

  danger: "#E32626",
  dangerLight: "#FDECEC",

  warning: "#F28A00",
  warningLight: "#FFF3E4",

  // ---------------------------------------------------------
  // ACCENT
  // ---------------------------------------------------------
  accent: "#7047D9",
  accentLight: "#F2EDFF",

  // ---------------------------------------------------------
  // BLUE
  // ---------------------------------------------------------
  blue: "#1455B8",
  blueLight: "#EEF4FF",

  // ---------------------------------------------------------
  // COMMON
  // ---------------------------------------------------------
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
};

/*
|--------------------------------------------------------------------------
| FONT FAMILY
|--------------------------------------------------------------------------
|
| These names correspond to the fonts loaded in _layout.js
|
*/

export const FONTS = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};

/*
|--------------------------------------------------------------------------
| GLOBAL FONT SIZES
|--------------------------------------------------------------------------
*/

export const FONT_SIZES = {
  // Page
  pageTitle: 32,
  pageSubtitle: 15,

  // Sections
  sectionTitle: 19,
  sectionSubtitle: 13,

  // Cards
  cardTitle: 15,
  cardLabel: 11,

  // Body
  body: 14,
  bodySmall: 13,
  caption: 12,
  label: 11,

  // Navigation
  sidebar: 14,
  navigation: 14,

  // Buttons
  button: 13,

  // Tables
  tableHeader: 11,
  tableBody: 13,
  tableSecondary: 12,

  // Financial
  amount: 30,
  amountSmall: 24,

  // Small
  tiny: 10,
};

/*
|--------------------------------------------------------------------------
| GLOBAL SPACING
|--------------------------------------------------------------------------
*/

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

/*
|--------------------------------------------------------------------------
| BORDER RADIUS
|--------------------------------------------------------------------------
*/

export const RADIUS = {
  sm: 7,
  md: 9,
  lg: 12,
  xl: 14,
  card: 14,
};

/*
|--------------------------------------------------------------------------
| COMMON SHADOW
|--------------------------------------------------------------------------
|
| Keep this subtle for production UI.
|
*/

export const SHADOWS = {
  card: {
    shadowColor: "#10244A",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  modal: {
    shadowColor: "#10244A",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
};