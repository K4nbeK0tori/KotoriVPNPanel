import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';

const STORAGE_DARK = 'dark-mode';
const STORAGE_ULTRA = 'isUltraDarkThemeEnabled';

function readBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === 'true';
}

function applyDom(isDark: boolean, isUltra: boolean) {
  document.body.classList.remove('dark', 'light');
  document.body.classList.add(isDark ? 'dark' : 'light');
  if (isUltra) {
    document.documentElement.setAttribute('data-theme', 'ultra-dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const msg = document.getElementById('message');
  if (msg) {
    msg.classList.remove('dark', 'light');
    msg.classList.add(isDark ? 'dark' : 'light');
  }
}

// module load so the document is in the right theme before React mounts.
const initialDark = readBool(STORAGE_DARK, true);
const initialUltra = readBool(STORAGE_ULTRA, false);
applyDom(initialDark, initialUltra);

// Sakura (anime) palette: soft pink primary on light, plum-purple on dark.
const PINK_PRIMARY = '#ec4899';
const PINK_PRIMARY_HOVER = '#f06292';
const PINK_PRIMARY_ACTIVE = '#d63384';
const DARK_PRIMARY = '#f472b6';
const DARK_PRIMARY_HOVER = '#f9a8d4';
const DARK_PRIMARY_ACTIVE = '#ec4899';

const LIGHT_TOKENS = {
  colorPrimary: PINK_PRIMARY,
  colorInfo: PINK_PRIMARY,
  colorBgBase: '#fff5f9',
  colorBgLayout: '#fdf2f8',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  borderRadius: 12,
};
const DARK_TOKENS = {
  colorPrimary: DARK_PRIMARY,
  colorInfo: DARK_PRIMARY,
  colorBgBase: '#191420',
  colorBgLayout: '#191420',
  colorBgContainer: '#221a2e',
  colorBgElevated: '#2a2138',
  borderRadius: 12,
};
const ULTRA_DARK_TOKENS = {
  colorPrimary: DARK_PRIMARY,
  colorInfo: DARK_PRIMARY,
  colorBgBase: '#0d0912',
  colorBgLayout: '#0d0912',
  colorBgContainer: '#140e1c',
  colorBgElevated: '#1c1426',
  borderRadius: 12,
};
const DARK_LAYOUT_TOKENS = {
  bodyBg: '#191420',
  headerBg: '#161020',
  headerColor: '#ffffff',
  footerBg: '#191420',
  siderBg: '#161020',
  triggerBg: '#221a2e',
  triggerColor: '#ffffff',
};
const ULTRA_DARK_LAYOUT_TOKENS = {
  bodyBg: '#0d0912',
  headerBg: '#0a070f',
  headerColor: '#ffffff',
  footerBg: '#0d0912',
  siderBg: '#0a070f',
  triggerBg: '#140e1c',
  triggerColor: '#ffffff',
};
const DARK_MENU_TOKENS = {
  darkItemBg: '#161020',
  darkSubMenuItemBg: '#191420',
  darkPopupBg: '#221a2e',
};
const ULTRA_DARK_MENU_TOKENS = {
  darkItemBg: '#0a070f',
  darkSubMenuItemBg: '#0d0912',
  darkPopupBg: '#140e1c',
};
const DARK_CARD_TOKENS = {
  colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
};
const ULTRA_DARK_CARD_TOKENS = {
  colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
};
const STATISTIC_TOKENS = {
  contentFontSize: 17,
  titleFontSize: 11,
};
const LIGHT_CONTRAST_TOKENS = {
  colorTextDescription: 'rgba(0, 0, 0, 0.58)',
  colorTextTertiary: 'rgba(0, 0, 0, 0.58)',
  colorTextPlaceholder: '#767676',
  colorError: '#cf1322',
  colorErrorText: '#cf1322',
  colorSuccessText: '#237804',
};
const LIGHT_BUTTON_TOKENS = {
  colorPrimary: PINK_PRIMARY,
  colorPrimaryHover: PINK_PRIMARY_HOVER,
  colorPrimaryActive: PINK_PRIMARY_ACTIVE,
};

// hashed:false drops the `:where(.css-<hash>)` wrapper antd puts around every
// rule. It costs nothing in specificity — `:where()` contributes zero, so the
// panel's own `.ant-*` overrides still win — and it removes roughly 5,700
// wrappers, 16% of the generated stylesheet, from what the browser has to parse.
//
// cssVar.key pins the CSS-variable scope. Every panel page mounts its own
// ConfigProvider (there is no root one), and without a fixed key each mints a
// fresh useId-derived scope, so navigating re-serialises and re-injects the whole
// token block under a new class instead of reusing the one already in the head.
const SHARED_STYLE_CONFIG = {
  hashed: false,
  cssVar: { key: 'xui' },
} as const;

export function buildAntdThemeConfig(isDark: boolean, isUltra: boolean): ThemeConfig {
  if (!isDark) {
    return {
      ...SHARED_STYLE_CONFIG,
      algorithm: antdTheme.defaultAlgorithm,
      token: { ...LIGHT_TOKENS, ...LIGHT_CONTRAST_TOKENS },
      components: {
        Statistic: STATISTIC_TOKENS,
        Button: LIGHT_BUTTON_TOKENS,
        Card: { borderRadiusLG: 14 },
      },
    };
  }
  return {
    ...SHARED_STYLE_CONFIG,
    algorithm: antdTheme.darkAlgorithm,
    token: {
      ...(isUltra ? ULTRA_DARK_TOKENS : DARK_TOKENS),
      colorPrimaryHover: isUltra ? DARK_PRIMARY_HOVER : DARK_PRIMARY_HOVER,
      colorPrimaryActive: isUltra ? DARK_PRIMARY_ACTIVE : DARK_PRIMARY_ACTIVE,
    },
    components: {
      Layout: isUltra ? ULTRA_DARK_LAYOUT_TOKENS : DARK_LAYOUT_TOKENS,
      Menu: isUltra ? ULTRA_DARK_MENU_TOKENS : DARK_MENU_TOKENS,
      Card: isUltra ? ULTRA_DARK_CARD_TOKENS : DARK_CARD_TOKENS,
      Statistic: STATISTIC_TOKENS,
    },
  };
}

export function pauseAnimationsUntilLeave(elementId: string): void {
  document.documentElement.setAttribute('data-theme-animations', 'off');
  const el = document.getElementById(elementId);
  if (!el) return;
  const restore = () => {
    document.documentElement.removeAttribute('data-theme-animations');
    el.removeEventListener('mouseleave', restore);
    el.removeEventListener('touchend', restore);
  };
  el.addEventListener('mouseleave', restore);
  el.addEventListener('touchend', restore);
}

interface ThemeContextValue {
  isDark: boolean;
  isUltra: boolean;
  toggleTheme: () => void;
  toggleUltra: () => void;
  antdThemeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(initialDark);
  const [isUltra, setIsUltra] = useState<boolean>(initialUltra);

  useLayoutEffect(() => {
    applyDom(isDark, isUltra);
    localStorage.setItem(STORAGE_DARK, String(isDark));
    localStorage.setItem(STORAGE_ULTRA, String(isUltra));
  }, [isDark, isUltra]);

  const toggleTheme = useCallback(() => setIsDark((v) => !v), []);
  const toggleUltra = useCallback(() => setIsUltra((v) => !v), []);

  const antdThemeConfig = useMemo(() => buildAntdThemeConfig(isDark, isUltra), [isDark, isUltra]);

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, isUltra, toggleTheme, toggleUltra, antdThemeConfig }),
    [isDark, isUltra, toggleTheme, toggleUltra, antdThemeConfig],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
