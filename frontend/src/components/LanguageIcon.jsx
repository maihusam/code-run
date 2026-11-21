import { createElement } from "react";
import { getLanguageIcon } from "../data/languageVisuals";

export default function LanguageIcon({ language, className }) {
  return createElement(getLanguageIcon(language), {
    className,
    "aria-hidden": true,
  });
}
