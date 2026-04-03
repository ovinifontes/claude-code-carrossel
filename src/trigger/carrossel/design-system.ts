// ═══════════════════════════════════════════════════
// ArkheDigital — Design System for Instagram Carousel
// ═══════════════════════════════════════════════════

// --- Color Palette (6-token system derived from Arkhe Blue) ---

export const COLORS = {
  // Brand palette
  BRAND_PRIMARY: "#045C90",
  BRAND_LIGHT: "#3A8ABF",
  BRAND_DARK: "#033160",

  // Accents (existing ArkheDigital identity)
  CYAN: "#24D1E7",
  ENERGY_ORANGE: "#F58118",

  // Backgrounds
  LIGHT_BG: "#F8F6F3",
  LIGHT_BORDER: "#E8E5E1",
  DARK_BG: "#0B1622",
  DARK_BG2: "#111D2E",

  // Text
  WHITE: "#FFFFFF",
  LIGHT_GRAY: "#B8C5D3",
  DARK_TEXT: "#1A1D23",
  MUTED_DARK: "#5A5F6B",
} as const;

// --- Brand Gradient ---

export const BRAND_GRADIENT =
  "linear-gradient(165deg, #033160 0%, #045C90 50%, #3A8ABF 100%)";

// --- Typography ---

export const TYPOGRAPHY = {
  FONT_IMPORT:
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap",
  HEADING_FONT: "'Plus Jakarta Sans', sans-serif",
  BODY_FONT: "'Plus Jakarta Sans', sans-serif",

  // Scale (at 1080px viewport)
  HEADING_SIZE: "78px",
  HEADING_WEIGHT: "700",
  HEADING_LINE_HEIGHT: "1.1",
  HEADING_LETTER_SPACING: "-1px",

  BODY_SIZE: "36px",
  BODY_WEIGHT: "400",
  BODY_LINE_HEIGHT: "1.55",

  TAG_SIZE: "26px",
  TAG_WEIGHT: "600",
  TAG_LETTER_SPACING: "5px",

  SMALL_SIZE: "28px",
  COUNTER_SIZE: "28px",
  COUNTER_WEIGHT: "500",
} as const;

// --- Layout ---

export const LAYOUT = {
  WIDTH: 1080,
  HEIGHT: 1350,
  PADDING_H: 50, // horizontal safe margin
  PADDING_TOP: 100, // top safe zone
  PADDING_BOTTOM: 100, // bottom safe zone (progress bar area)
} as const;

// --- Slide Background Modes ---

export type BgMode = "light" | "dark" | "gradient";

export interface SlideTypeConfig {
  type: string;
  bgMode: BgMode;
}

export const SLIDE_SEQUENCE: SlideTypeConfig[] = [
  { type: "hero", bgMode: "light" },
  { type: "problem", bgMode: "dark" },
  { type: "example", bgMode: "light" },
  { type: "solution", bgMode: "gradient" },
  { type: "visual", bgMode: "dark" },
  { type: "value", bgMode: "light" },
  { type: "value", bgMode: "dark" },
  { type: "value", bgMode: "light" },
  { type: "impact", bgMode: "dark" },
  { type: "cta", bgMode: "gradient" },
];

// --- Helper Functions ---

export function getSlideBackground(mode: BgMode): string {
  switch (mode) {
    case "light":
      return `background: ${COLORS.LIGHT_BG};`;
    case "dark":
      return `background: linear-gradient(180deg, ${COLORS.DARK_BG} 0%, ${COLORS.DARK_BG2} 100%);`;
    case "gradient":
      return `background: ${BRAND_GRADIENT};`;
  }
}

export function getTextColors(mode: BgMode): {
  heading: string;
  body: string;
  muted: string;
  tag: string;
} {
  switch (mode) {
    case "light":
      return {
        heading: COLORS.DARK_TEXT,
        body: COLORS.MUTED_DARK,
        muted: "#8A8F9A",
        tag: COLORS.BRAND_PRIMARY,
      };
    case "dark":
      return {
        heading: COLORS.WHITE,
        body: COLORS.LIGHT_GRAY,
        muted: "rgba(255,255,255,0.5)",
        tag: COLORS.BRAND_LIGHT,
      };
    case "gradient":
      return {
        heading: COLORS.WHITE,
        body: "rgba(255,255,255,0.9)",
        muted: "rgba(255,255,255,0.6)",
        tag: "rgba(255,255,255,0.7)",
      };
  }
}

// --- Reusable Components ---

export function progressBar(
  index: number,
  total: number,
  mode: BgMode
): string {
  const pct = ((index + 1) / total) * 100;
  const isLight = mode === "light";
  const trackColor = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";
  const fillColor = isLight ? COLORS.BRAND_PRIMARY : COLORS.WHITE;
  const labelColor = isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)";

  return `<div style="position:absolute;bottom:0;left:0;right:0;padding:16px 50px 24px;z-index:10;display:flex;align-items:center;gap:10px;">
    <div style="flex:1;height:4px;background:${trackColor};border-radius:2px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:${fillColor};border-radius:2px;transition:width 0.3s;"></div>
    </div>
    <span style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.COUNTER_SIZE};color:${labelColor};font-weight:${TYPOGRAPHY.COUNTER_WEIGHT};white-space:nowrap;">${index + 1}/${total}</span>
  </div>`;
}

export function swipeArrow(mode: BgMode): string {
  const isLight = mode === "light";
  const bg = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";
  const stroke = isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)";

  return `<div style="position:absolute;right:0;top:0;bottom:0;width:48px;z-index:9;display:flex;align-items:center;justify-content:center;background:linear-gradient(to right,transparent,${bg});">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>`;
}

export function logoLockup(mode: BgMode, logoBase64?: string): string {
  const isLight = mode === "light";
  const nameColor = isLight ? COLORS.DARK_TEXT : COLORS.WHITE;
  const circleBg = COLORS.BRAND_PRIMARY;

  const logoImg = logoBase64
    ? `<img src="${logoBase64}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" />`
    : `<div style="width:44px;height:44px;border-radius:50%;background:${circleBg};display:flex;align-items:center;justify-content:center;">
        <span style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:22px;font-weight:800;color:${COLORS.WHITE};">A</span>
      </div>`;

  return `<div style="display:flex;align-items:center;gap:14px;">
    ${logoImg}
    <span style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:30px;font-weight:600;letter-spacing:0.5px;color:${nameColor};">ArkheDigital</span>
  </div>`;
}

export function tagLabel(text: string, mode: BgMode): string {
  const colors = getTextColors(mode);
  return `<span style="display:inline-block;font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.TAG_SIZE};font-weight:${TYPOGRAPHY.TAG_WEIGHT};letter-spacing:${TYPOGRAPHY.TAG_LETTER_SPACING};color:${colors.tag};text-transform:uppercase;">${text}</span>`;
}

export function featureListItem(
  icon: string,
  label: string,
  description: string,
  mode: BgMode
): string {
  const colors = getTextColors(mode);
  const borderColor =
    mode === "light" ? COLORS.LIGHT_BORDER : "rgba(255,255,255,0.08)";

  return `<div style="display:flex;align-items:flex-start;gap:20px;padding:18px 0;border-bottom:1px solid ${borderColor};">
    <span style="font-size:32px;width:36px;text-align:center;flex-shrink:0;">${icon}</span>
    <div style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:34px;font-weight:600;color:${colors.heading};">${label}</span>
      <span style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:28px;color:${colors.body};line-height:1.4;">${description}</span>
    </div>
  </div>`;
}

export function numberedStep(
  num: number,
  title: string,
  description: string,
  mode: BgMode
): string {
  const colors = getTextColors(mode);
  const accentColor =
    mode === "light" ? COLORS.BRAND_PRIMARY : COLORS.BRAND_LIGHT;
  const borderColor =
    mode === "light" ? COLORS.LIGHT_BORDER : "rgba(255,255,255,0.08)";
  const padded = String(num).padStart(2, "0");

  return `<div style="display:flex;align-items:flex-start;gap:20px;padding:18px 0;border-bottom:1px solid ${borderColor};">
    <span style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:48px;font-weight:300;color:${accentColor};min-width:56px;line-height:1;">${padded}</span>
    <div style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:34px;font-weight:600;color:${colors.heading};">${title}</span>
      <span style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:28px;color:${colors.body};line-height:1.4;">${description}</span>
    </div>
  </div>`;
}

export function ctaButton(text: string): string {
  return `<div style="display:inline-flex;align-items:center;gap:10px;padding:20px 48px;background:${COLORS.LIGHT_BG};color:${COLORS.BRAND_DARK};font-family:${TYPOGRAPHY.BODY_FONT};font-weight:600;font-size:32px;border-radius:40px;">
    ${text}
  </div>`;
}

export function promptBox(label: string, quote: string): string {
  return `<div style="padding:28px;background:rgba(0,0,0,0.15);border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
    <p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:26px;color:rgba(255,255,255,0.5);margin:0 0 10px 0;">${label}</p>
    <p style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:30px;color:${COLORS.WHITE};font-style:italic;line-height:1.4;margin:0;">"${quote}"</p>
  </div>`;
}

// --- HTML Document Wrapper ---

export function wrapSlideHTML(
  innerContent: string,
  mode: BgMode,
  slideIndex: number,
  totalSlides: number,
  isLastSlide: boolean
): string {
  const bg = getSlideBackground(mode);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="${TYPOGRAPHY.FONT_IMPORT}" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${LAYOUT.WIDTH}px;
      height: ${LAYOUT.HEIGHT}px;
      overflow: hidden;
      font-family: ${TYPOGRAPHY.BODY_FONT};
      -webkit-font-smoothing: antialiased;
    }
    .slide {
      position: relative;
      width: ${LAYOUT.WIDTH}px;
      height: ${LAYOUT.HEIGHT}px;
      ${bg}
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .slide-content {
      position: relative;
      z-index: 2;
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: ${LAYOUT.PADDING_TOP}px ${LAYOUT.PADDING_H}px ${LAYOUT.PADDING_BOTTOM}px;
    }
  </style>
</head>
<body>
  <div class="slide">
    <div class="slide-content">
      ${innerContent}
    </div>
    ${progressBar(slideIndex, totalSlides, mode)}
    ${isLastSlide ? "" : swipeArrow(mode)}
  </div>
</body>
</html>`;
}
