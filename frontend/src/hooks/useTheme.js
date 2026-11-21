import { useEffect, useState } from "react";

const STORAGE_KEY = "code-theme";

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    /* storage unavailable */
  }

  // Dark is the default; only an explicit choice switches to light.
  return "dark";
};

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0a0c10" : "#f6f8fa");

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
    /* storage unavailable */
  }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
}
