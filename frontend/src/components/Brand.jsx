import { LuMoon, LuSun } from "react-icons/lu";

export function Logo({ className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 19h7"
        stroke="var(--accent)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      onClick={onToggle}
      className="icon-btn"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
    >
      {isDark ? <LuSun className="w-4 h-4" /> : <LuMoon className="w-4 h-4" />}
    </button>
  );
}
