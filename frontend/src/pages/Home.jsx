import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowRight, LuChevronDown, LuSearch } from "react-icons/lu";
import { useTheme } from "../hooks/useTheme";
import {
  LANGUAGE_GROUPS,
  POPULAR_LANGUAGE_GROUPS,
  getLanguageById,
  getLanguageGroupById,
  searchLanguageGroups,
} from "../data/languages";
import LanguageIcon from "../components/LanguageIcon";
import DemoTerminal from "../components/DemoTerminal";
import { Logo, ThemeToggle } from "../components/Brand";

const RECENT_LANGUAGES_KEY = "code-run.recent-languages";
const MAX_RECENT_LANGUAGES = 6;
const MAX_DRAFT_CARDS = 3;

const readRecentLanguages = () => {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_LANGUAGES_KEY) || "[]",
    );
    return Array.isArray(parsed)
      ? parsed.map(Number).filter(Number.isFinite)
      : [];
  } catch {
    return [];
  }
};

const persistRecentLanguages = (languageIds) => {
  try {
    window.localStorage.setItem(
      RECENT_LANGUAGES_KEY,
      JSON.stringify(languageIds),
    );
  } catch {
    /* storage unavailable */
  }
};

// A "draft" is saved editor code that differs from the starter template.
const readDraft = (languageOption) => {
  try {
    const saved = window.localStorage.getItem(
      `code-run.editor.${languageOption.routeValue}.current`,
    );
    return saved && saved.trim() && saved !== languageOption.starterCode
      ? saved
      : null;
  } catch {
    return null;
  }
};

const previewLines = (code) =>
  code
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 3)
    .map((line) => (line.length > 44 ? `${line.slice(0, 44)}…` : line));

export default function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentLanguageIds, setRecentLanguageIds] = useState(
    readRecentLanguages,
  );

  const isFiltering = query.trim().length > 0;
  const searchResults = useMemo(() => searchLanguageGroups(query), [query]);
  const results = isFiltering
    ? searchResults
    : showAll
      ? LANGUAGE_GROUPS
      : POPULAR_LANGUAGE_GROUPS;

  const drafts = useMemo(
    () =>
      recentLanguageIds
        .map((id) => {
          const option = getLanguageById(id);
          const code = option ? readDraft(option) : null;
          return code
            ? {
                group: getLanguageGroupById(id),
                option,
                lines: previewLines(code),
                lineCount: code.split(/\r?\n/).length,
              }
            : null;
        })
        .filter((draft) => draft?.group)
        .slice(0, MAX_DRAFT_CARDS),
    [recentLanguageIds],
  );
  const draftIds = useMemo(
    () => new Set(drafts.map((draft) => draft.option.id)),
    [drafts],
  );

  const openLanguage = (languageOption) => {
    if (!languageOption) {
      return;
    }

    const next = [
      languageOption.id,
      ...recentLanguageIds.filter((id) => id !== languageOption.id),
    ].slice(0, MAX_RECENT_LANGUAGES);

    setRecentLanguageIds(next);
    persistRecentLanguages(next);
    navigate(`/editor/${languageOption.routeValue}`);
  };

  const openLanguageGroup = (languageGroup) =>
    openLanguage(languageGroup?.primaryOption);

  const focusSearch = () => {
    document
      .getElementById("languages")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    inputRef.current?.focus({ preventScroll: true });
  };

  // "/" jumps to search from anywhere, like GitHub and most docs sites.
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (
        event.key === "/" &&
        tag !== "INPUT" &&
        tag !== "TEXTAREA" &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        event.preventDefault();
        focusSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
    setActiveIndex(0);
  };

  const moveActive = (delta) => {
    const nextIndex = Math.min(
      results.length - 1,
      Math.max(0, activeIndex + delta),
    );
    setActiveIndex(nextIndex);
    listRef.current
      ?.querySelector(`[data-index="${nextIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter" && results.length) {
      event.preventDefault();
      openLanguageGroup(results[activeIndex] || results[0]);
    } else if (event.key === "Escape") {
      setQuery("");
      setActiveIndex(0);
      event.currentTarget.blur();
    }
  };

  const python = getLanguageById(71);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mx-auto w-full max-w-6xl flex items-center justify-between px-5 sm:px-8 h-16">
        <div className="flex items-center gap-2.5">
          <Logo className="w-[22px] h-[22px]" />
          <span className="font-mono font-bold tracking-tight">coderun</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={focusSearch}
            className="hidden sm:inline-flex items-center gap-2 h-8 pl-3 pr-2 rounded-md border border-line text-sm text-ink-3 hover:text-ink-2 hover:border-line-strong transition-colors"
          >
            Find a language
            <span className="kbd">/</span>
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8 pb-24">
        {/* Hero */}
        <section className="grid lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-14 items-center pt-8 sm:pt-16 pb-14 sm:pb-24">
          <div>
            <p
              className="rise font-mono text-sm text-accent"
              style={{ animationDelay: "0ms" }}
            >
              $ coderun --langs {LANGUAGE_GROUPS.length}
            </p>
            <h1
              className="rise mt-5 font-display font-bold text-[2.6rem] sm:text-6xl leading-[1.04] tracking-[-0.04em]"
              style={{ animationDelay: "70ms" }}
            >
              Write code.
              <br />
              Hit <span className="text-accent">run</span>
              <span className="caret" aria-hidden="true" />
            </h1>
            <p
              className="rise mt-6 max-w-md text-base sm:text-lg leading-relaxed text-ink-2"
              style={{ animationDelay: "150ms" }}
            >
              A no-setup playground for {LANGUAGE_GROUPS.length} languages.
              Open a tab, type, and see real output in seconds. Drafts autosave
              in your browser.
            </p>

            <div
              className="rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "230ms" }}
            >
              <button
                onClick={() => openLanguage(python)}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-accent text-accent-ink font-semibold text-sm hover:bg-accent-hover active:translate-y-px transition-colors"
              >
                Start with Python
                <LuArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={focusSearch}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-line-strong text-sm font-medium text-ink-2 hover:text-ink hover:bg-raised transition-colors"
              >
                Pick another language
              </button>
            </div>
          </div>

          <div className="rise" style={{ animationDelay: "200ms" }}>
            <DemoTerminal onOpen={(id) => openLanguage(getLanguageById(id))} />
          </div>
        </section>

        {/* Drafts */}
        {drafts.length > 0 && (
          <section className="pb-14">
            <h2 className="text-xs font-mono uppercase tracking-[0.12em] text-ink-3 mb-4">
              Pick up where you left off
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.map(({ group, option, lines, lineCount }) => (
                <button
                  key={option.id}
                  onClick={() => openLanguage(option)}
                  className="group text-left rounded-xl border border-line bg-surface p-4 hover:border-accent/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <LanguageIcon language={option} className="w-4 h-4" />
                      {group.label}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {lineCount} {lineCount === 1 ? "line" : "lines"}
                    </span>
                  </div>
                  <pre className="mt-3 font-mono text-xs leading-5 text-ink-3 overflow-hidden">
                    {lines.join("\n")}
                  </pre>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Language index */}
        <section id="languages" className="scroll-mt-6">
          <label className="relative block">
            <span className="sr-only">Search languages</span>
            <LuSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-3" />
            <input
              ref={inputRef}
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search languages, or try .py  .rs  .cpp"
              autoComplete="off"
              spellCheck={false}
              className="w-full h-14 rounded-xl border border-line-strong bg-surface pl-12 pr-14 font-mono text-sm placeholder:text-ink-3 transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]"
            />
            <span className="kbd absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-block">
              /
            </span>
          </label>

          <div className="mt-8 flex items-baseline justify-between border-b border-line-strong pb-2 text-xs text-ink-3 font-mono">
            <span className="uppercase tracking-[0.12em]">
              {isFiltering
                ? `${results.length} ${results.length === 1 ? "match" : "matches"}`
                : showAll
                  ? `All languages · ${LANGUAGE_GROUPS.length}`
                  : "Popular"}
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <span className="kbd">↑</span>
              <span className="kbd">↓</span>
              move
              <span className="kbd ml-2">Enter</span>
              open
            </span>
          </div>

          {results.length ? (
            <ul ref={listRef} role="listbox" aria-label="Languages">
              {results.map((languageGroup, index) => {
                const isActive = isSearchFocused && index === activeIndex;
                const hasDraft = languageGroup.options.some((option) =>
                  draftIds.has(option.id),
                );

                return (
                  <li key={languageGroup.key} data-index={index}>
                    <button
                      role="option"
                      aria-selected={isActive}
                      onClick={() => openLanguageGroup(languageGroup)}
                      onMouseMove={() => setActiveIndex(index)}
                      className={`group relative w-full flex items-center gap-4 px-3 sm:px-4 py-3.5 border-b border-line text-left transition-colors hover:bg-surface ${
                        isActive ? "bg-surface" : ""
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent transition-opacity ${
                          isActive ? "opacity-100" : "opacity-0"
                        } group-hover:opacity-100`}
                      />
                      <LanguageIcon
                        language={languageGroup.primaryOption}
                        className={`w-5 h-5 shrink-0 transition-colors group-hover:text-accent ${
                          isActive ? "text-accent" : "text-ink-2"
                        }`}
                      />
                      <span className="flex-1 min-w-0 flex items-baseline gap-3">
                        <span className="font-medium">
                          {languageGroup.label}
                        </span>
                        <span className="truncate text-sm text-ink-3">
                          {languageGroup.runtimeSummary}
                        </span>
                      </span>
                      {hasDraft && (
                        <span className="font-mono text-[11px] text-accent">
                          draft
                        </span>
                      )}
                      <span className="hidden sm:block font-mono text-xs text-ink-3">
                        .{languageGroup.primaryOption.extension}
                      </span>
                      <LuArrowRight className="w-4 h-4 text-ink-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-16 text-center">
              <p className="font-mono text-xl">
                <span className="text-accent">$</span> no match found
              </p>
              <p className="mt-2 text-sm text-ink-3">
                Try a language name, a version, or an extension like{" "}
                <span className="font-mono">.go</span>.
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="mt-5 text-sm text-accent hover:underline underline-offset-4"
              >
                Clear search
              </button>
            </div>
          )}

          {!isFiltering && (
            <button
              onClick={() => setShowAll((value) => !value)}
              className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-line-strong text-sm text-ink-2 hover:text-ink hover:bg-surface transition-colors"
            >
              {showAll
                ? "Show popular only"
                : `Show all ${LANGUAGE_GROUPS.length} languages`}
              <LuChevronDown
                className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-8 text-sm text-ink-3 flex items-center justify-between border-t border-line">
        <span>Built by Sanyam Kumar Patel</span>
        <span className="hidden sm:inline font-mono text-xs">
          Execution by Judge0
        </span>
      </footer>
    </div>
  );
}
