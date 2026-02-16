import {
  VscCode,
  VscDatabase,
  VscFileCode,
  VscTerminal,
} from "react-icons/vsc";
import {
  SiAssemblyscript,
  SiC,
  SiClojure,
  SiCplusplus,
  SiDotnet,
  SiElixir,
  SiErlang,
  SiFortran,
  SiFsharp,
  SiGo,
  SiGnubash,
  SiHaskell,
  SiJavascript,
  SiKotlin,
  SiLua,
  SiOcaml,
  SiOctave,
  SiPerl,
  SiPhp,
  SiPython,
  SiR,
  SiRuby,
  SiRust,
  SiScala,
  SiSqlite,
  SiSwift,
  SiTypescript,
} from "react-icons/si";
import { FaJava } from "react-icons/fa";

const ICON_BY_BASE_LANGUAGE = {
  assembly: SiAssemblyscript,
  bash: SiGnubash,
  c: SiC,
  "c#": SiDotnet,
  clojure: SiClojure,
  javascript: SiJavascript,
  python: SiPython,
  "c++": SiCplusplus,
  java: FaJava,
  rust: SiRust,
  go: SiGo,
  php: SiPhp,
  ruby: SiRuby,
  kotlin: SiKotlin,
  lua: SiLua,
  typescript: SiTypescript,
  swift: SiSwift,
  scala: SiScala,
  haskell: SiHaskell,
  perl: SiPerl,
  r: SiR,
  sql: SiSqlite,
  elixir: SiElixir,
  erlang: SiErlang,
  "f#": SiFsharp,
  fortran: SiFortran,
  ocaml: SiOcaml,
  octave: SiOctave,
  "visual basic.net": SiDotnet,
  "objective-c": SiC,
  "plain text": VscFileCode,
  executable: VscFileCode,
  "multi-file program": VscFileCode,
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const pickFallbackIcon = (baseLanguage) => {
  if (baseLanguage.includes("sql")) {
    return VscDatabase;
  }

  if (baseLanguage.includes("bash") || baseLanguage.includes("shell")) {
    return VscTerminal;
  }

  if (baseLanguage.includes("text") || baseLanguage.includes("file")) {
    return VscFileCode;
  }

  return VscCode;
};

const buildPalette = (languageId) => {
  const id = Number(languageId) || 1;
  const hue = (id * 37 + 23) % 360;

  return {
    lightBg: `hsl(${hue} 95% 95%)`,
    lightFg: `hsl(${hue} 64% 34%)`,
    lightBorder: `hsl(${hue} 62% 82%)`,
    darkBg: `hsl(${hue} 40% 18%)`,
    darkFg: `hsl(${hue} 85% 72%)`,
    darkBorder: `hsl(${hue} 50% 35%)`,
  };
};

export const getLanguageVisual = (languageOption, isDark) => {
  const baseLanguage = normalize(languageOption?.label);
  const Icon =
    ICON_BY_BASE_LANGUAGE[baseLanguage] || pickFallbackIcon(baseLanguage);
  const palette = buildPalette(languageOption?.id);

  return {
    Icon,
    badgeStyle: {
      backgroundColor: isDark ? palette.darkBg : palette.lightBg,
      color: isDark ? palette.darkFg : palette.lightFg,
      borderColor: isDark ? palette.darkBorder : palette.lightBorder,
    },
  };
};
