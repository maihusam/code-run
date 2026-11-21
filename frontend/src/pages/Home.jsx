import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import {
  POPULAR_LANGUAGE_GROUPS,
  getLanguageGroupById,
  searchLanguageGroups,
} from "../data/languages";
import { getLanguageVisual } from "../data/languageVisuals";

const QUICK_OPEN_PLACEHOLDER = "Type . to start or paste Path";
const RECENT_LANGUAGES_KEY = "code-run.recent-languages";
const MAX_RECENT_LANGUAGES = 6;

const readRecentLanguages = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_LANGUAGES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  } catch {
    return [];
  }
};

const persistRecentLanguages = (languageIds) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      RECENT_LANGUAGES_KEY,
      JSON.stringify(languageIds),
    );
  } catch {}
};

export default function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDarkTheme = theme === "dark";
  const [query, setQuery] = useState("");
  const [recentLanguageIds, setRecentLanguageIds] = useState(() =>
    readRecentLanguages(),
  );

  const filteredLanguageGroups = useMemo(
    () => searchLanguageGroups(query),
    [query],
  );
  const recentLanguageGroups = useMemo(
    () =>
      recentLanguageIds
        .map((id) => getLanguageGroupById(id))
        .filter(Boolean)
        .filter(
          (group, index, groups) =>
            groups.findIndex((candidate) => candidate.key === group.key) ===
            index,
        ),
    [recentLanguageIds],
  );
  const quickLanguageGroups =
    recentLanguageGroups.length > 0
      ? recentLanguageGroups
      : POPULAR_LANGUAGE_GROUPS;

  const handleOpenLanguageGroup = (languageGroup) => {
    if (!languageGroup?.primaryOption) {
      return;
    }

    const targetLanguage = languageGroup.primaryOption;

    const nextRecentLanguages = [
      targetLanguage.id,
      ...recentLanguageIds.filter((id) => id !== targetLanguage.id),
    ].slice(0, MAX_RECENT_LANGUAGES);

    setRecentLanguageIds(nextRecentLanguages);
    persistRecentLanguages(nextRecentLanguages);
    navigate(`/editor/${targetLanguage.routeValue}`);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter" && filteredLanguageGroups.length) {
      event.preventDefault();
      handleOpenLanguageGroup(filteredLanguageGroups[0]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a] text-neutral-900 dark:text-white transition-colors duration-300 selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <header
        className="home-enter-soft flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-neutral-200 dark:border-neutral-800/80"
        style={{ animationDelay: "40ms" }}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 dark:text-white text-black"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          <span className="font-semibold tracking-tight text-lg">Code</span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 sm:p-6 relative">
        <div className="home-grid-drift absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#171717_1px,transparent_1px),linear-gradient(to_bottom,#171717_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none -z-10" />

        <div className="w-full max-w-5xl flex-1 flex flex-col">
          <div
            className="home-enter text-center space-y-4 mb-6 sm:mb-8"
            style={{ animationDelay: "100ms" }}
          >
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Run any language,
              <span className="text-neutral-500 dark:text-neutral-400">
                {" "}
                fast.
              </span>
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Pick a language and start coding instantly.
            </p>
          </div>

          <section
            className="home-enter rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/85 dark:bg-[#101010]/90 backdrop-blur-sm shadow-sm overflow-hidden flex-1 flex flex-col min-h-0"
            style={{ animationDelay: "170ms" }}
          >
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <span>Quick Open</span>
                <span>Press Enter to open top result</span>
              </div>

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={QUICK_OPEN_PLACEHOLDER}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0f0f0f] px-3 py-2.5 text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />

              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Press Enter to open the first result.
              </p>

              {!query.trim() && (
                <div className="flex flex-wrap gap-2">
                  {quickLanguageGroups.map((languageGroup, index) => {
                    const languageVisual = getLanguageVisual(
                      languageGroup.primaryOption,
                      isDarkTheme,
                    );
                    const LanguageIcon = languageVisual.Icon;

                    return (
                      <button
                        key={`quick-${languageGroup.key}`}
                        onClick={() => handleOpenLanguageGroup(languageGroup)}
                        className="home-chip-enter inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-medium border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        style={{ animationDelay: `${240 + index * 36}ms` }}
                      >
                        <span
                          className="inline-flex items-center justify-center rounded-full h-5 w-5 border"
                          style={languageVisual.badgeStyle}
                        >
                          <LanguageIcon className="w-3 h-3" />
                        </span>
                        {languageGroup.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 flex-1 min-h-0">
              {filteredLanguageGroups.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 overflow-y-auto h-full pr-1">
                  {filteredLanguageGroups.map((languageGroup, index) => {
                    const languageVisual = getLanguageVisual(
                      languageGroup.primaryOption,
                      isDarkTheme,
                    );
                    const LanguageIcon = languageVisual.Icon;

                    return (
                      <button
                        key={languageGroup.key}
                        onClick={() => handleOpenLanguageGroup(languageGroup)}
                        className="home-card-enter group flex items-center justify-between gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141414] hover:border-indigo-200 dark:hover:border-indigo-700/60 hover:shadow-sm transition-all text-left"
                        style={{
                          animationDelay: `${260 + (index % 12) * 46}ms`,
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {languageGroup.label}
                          </span>
                          <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {languageGroup.runtimeSummary}
                          </span>
                        </span>

                        <span
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border"
                          style={languageVisual.badgeStyle}
                        >
                          <LanguageIcon className="w-5 h-5" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
                  No language matched your search.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="py-5 text-center text-sm text-neutral-500 border-t border-neutral-200 dark:border-neutral-800/80">
        <p>Sanyam Kumar Patel</p>
      </footer>
    </div>
  );
}
