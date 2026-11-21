import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MonacoEditor from "@monaco-editor/react";
import {
  LuCheck,
  LuChevronDown,
  LuCopy,
  LuDownload,
  LuEraser,
  LuLoaderCircle,
  LuPlay,
  LuRotateCcw,
  LuTerminal,
  LuTriangleAlert,
  LuUndo2,
} from "react-icons/lu";
import { useTheme } from "../hooks/useTheme";
import { getLanguageByRouteParam, searchLanguages } from "../data/languages";
import LanguageIcon from "../components/LanguageIcon";
import { Logo, ThemeToggle } from "../components/Brand";
import { MOD_KEY } from "../lib/platform";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");
const STORAGE_KEY_PREFIX = "code-run.editor";
const SPLIT_STORAGE_KEY = "code-run.split";
const AUTOSAVE_DELAY_MS = 250;
const TOAST_TIMEOUT_MS = 2200;
const MIN_SPLIT = 25;
const MAX_SPLIT = 75;

const RUN_STATE_META = {
  idle: { label: "Ready", dot: "bg-ink-3", text: "text-ink-3" },
  running: { label: "Running", dot: "bg-warn animate-pulse", text: "text-warn" },
  success: { label: "Finished", dot: "bg-ok", text: "text-ok" },
  error: { label: "Failed", dot: "bg-bad", text: "text-bad" },
};

const TOAST_DOT = {
  info: "bg-ink-3",
  success: "bg-ok",
  warning: "bg-warn",
  error: "bg-bad",
};

const INPUT_PATTERNS = [
  /\bcin\s*(>>|<)/,
  /\bscanf\s*\(/,
  /\binput\s*\(/,
  /\bScanner\b/,
  /\bfmt\.Scan/,
  /\bread_line\s*\(/,
  /\bstdin\b/,
];

const needsInput = (source) =>
  INPUT_PATTERNS.some((pattern) => pattern.test(source));

const getDefaultCode = (languageOption) => languageOption?.starterCode || "";

const getCodeStorageKey = (languageStorageKey) =>
  `${STORAGE_KEY_PREFIX}.${languageStorageKey}.current`;

const getStoredCode = (languageStorageKey, fallbackCode) => {
  try {
    const savedCode = window.localStorage.getItem(
      getCodeStorageKey(languageStorageKey),
    );
    return savedCode !== null ? savedCode : fallbackCode;
  } catch {
    return fallbackCode;
  }
};

const getStoredSplit = () => {
  try {
    const value = Number(window.localStorage.getItem(SPLIT_STORAGE_KEY));
    return value >= MIN_SPLIT && value <= MAX_SPLIT ? value : 58;
  } catch {
    return 58;
  }
};

const formatDuration = (durationMs) => {
  if (durationMs < 1000) {
    return `${Math.max(1, Math.round(durationMs))}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
};

const getFileName = (languageOption) => {
  const extension = languageOption.extension || "txt";
  return extension === "java" ? "Main.java" : `main.${extension}`;
};

// Monaco themes tuned to the app palette so the editor doesn't look bolted on.
const defineMonacoThemes = (monaco) => {
  monaco.editor.defineTheme("coderun-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5f6b7e", fontStyle: "italic" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "type", foreground: "ffa657" },
      { token: "delimiter", foreground: "9aa4b5" },
    ],
    colors: {
      "editor.background": "#0f1218",
      "editor.foreground": "#e4e8f0",
      "editorLineNumber.foreground": "#3d4757",
      "editorLineNumber.activeForeground": "#9aa4b5",
      "editor.lineHighlightBackground": "#151a22",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#3ddc9733",
      "editor.inactiveSelectionBackground": "#3ddc9718",
      "editorCursor.foreground": "#3ddc97",
      "editorIndentGuide.background1": "#1c222c",
      "editorIndentGuide.activeBackground1": "#2b3441",
      "editorWidget.background": "#151a22",
      "editorWidget.border": "#2b3441",
      "scrollbarSlider.background": "#2b344155",
      "scrollbarSlider.hoverBackground": "#2b344199",
    },
  });

  monaco.editor.defineTheme("coderun-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8c959f", fontStyle: "italic" },
      { token: "keyword", foreground: "cf222e" },
      { token: "string", foreground: "0a3069" },
      { token: "number", foreground: "0550ae" },
      { token: "type", foreground: "953800" },
      { token: "delimiter", foreground: "57606a" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1f2328",
      "editorLineNumber.foreground": "#afb8c1",
      "editorLineNumber.activeForeground": "#57606a",
      "editor.lineHighlightBackground": "#f6f8fa",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#0a7f5530",
      "editor.inactiveSelectionBackground": "#0a7f5518",
      "editorCursor.foreground": "#0a7f55",
      "editorIndentGuide.background1": "#e1e6eb",
      "editorIndentGuide.activeBackground1": "#c9d1d9",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#c9d1d9",
    },
  });
};

export default function Editor() {
  const { language } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const languageMenuRef = useRef(null);
  const runRef = useRef(null);
  const languageSearchRef = useRef(null);
  const languageListRef = useRef(null);
  const layoutRef = useRef(null);
  const selectedLanguage = getLanguageByRouteParam(language);
  const languageStorageKey = selectedLanguage
    ? selectedLanguage.routeValue
    : String(language || "unknown");

  const [code, setCode] = useState(() =>
    getStoredCode(languageStorageKey, getDefaultCode(selectedLanguage)),
  );
  const [lastClearedCode, setLastClearedCode] = useState(null);
  const [toast, setToast] = useState(null);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");
  const [languageMenuIndex, setLanguageMenuIndex] = useState(0);

  const [stdin, setStdin] = useState("");
  const [consoleTab, setConsoleTab] = useState("output");
  const [output, setOutput] = useState("");
  const [runState, setRunState] = useState("idle");
  const [lastRunDuration, setLastRunDuration] = useState(null);
  const [lastRunAt, setLastRunAt] = useState(null);
  const [split, setSplit] = useState(getStoredSplit);
  const [isDragging, setIsDragging] = useState(false);
  const isDarkTheme = theme === "dark";

  const isSupported = Boolean(selectedLanguage);
  const isRunning = runState === "running";
  const activeLanguageOption = selectedLanguage || {
    id: -1,
    routeValue: String(language || ""),
    label: String(language || "Unknown"),
    runtime: "",
    badgeText: "??",
    monacoLanguage: "plaintext",
    extension: "txt",
    starterCode: "",
  };
  const filteredLanguageOptions = searchLanguages(languageSearchQuery);
  const lineCount = code ? code.split(/\r\n|\r|\n/).length : 0;
  const charCount = code.length;

  const runStateMeta = RUN_STATE_META[runState] || RUN_STATE_META.idle;

  const showToast = (message, tone = "info") => {
    setToast({ id: Date.now(), message, tone });
  };

  useEffect(() => {
    const fallbackCode = getDefaultCode(selectedLanguage);
    setCode(getStoredCode(languageStorageKey, fallbackCode));
    setLastClearedCode(null);
    setIsLanguageMenuOpen(false);
    setLanguageSearchQuery("");
    setStdin("");
    setConsoleTab("output");
    setOutput("");
    setRunState("idle");
    setLastRunDuration(null);
    setLastRunAt(null);
  }, [languageStorageKey, selectedLanguage]);

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return;
    }

    languageSearchRef.current?.focus();

    const handleOutsideClick = (event) => {
      if (languageMenuRef.current?.contains(event.target)) {
        return;
      }

      setIsLanguageMenuOpen(false);
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isLanguageMenuOpen]);

  useEffect(() => {
    const persistTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(getCodeStorageKey(languageStorageKey), code);
      } catch {
        /* storage unavailable */
      }
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(persistTimer);
  }, [code, languageStorageKey]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const toastTimer = window.setTimeout(() => {
      setToast(null);
    }, TOAST_TIMEOUT_MS);

    return () => window.clearTimeout(toastTimer);
  }, [toast]);

  const handleClearCode = () => {
    if (!code) {
      return;
    }

    setLastClearedCode(code);
    setCode("");
    showToast("Editor cleared. Undo is available.", "warning");
  };

  const handleUndoClear = () => {
    if (lastClearedCode === null) {
      return;
    }

    setCode(lastClearedCode);
    setLastClearedCode(null);
    showToast("Code brought back", "success");
  };

  const handleLanguageChange = (nextLanguage) => {
    setIsLanguageMenuOpen(false);

    if (!nextLanguage || nextLanguage.id === activeLanguageOption.id) {
      return;
    }

    navigate(`/editor/${nextLanguage.routeValue}`);
    showToast(`Switched to ${nextLanguage.label}`, "info");
  };

  const moveLanguageMenuIndex = (delta) => {
    const nextIndex = Math.min(
      filteredLanguageOptions.length - 1,
      Math.max(0, languageMenuIndex + delta),
    );
    setLanguageMenuIndex(nextIndex);
    languageListRef.current
      ?.querySelector(`[data-index="${nextIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const handleLanguageSearchKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveLanguageMenuIndex(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveLanguageMenuIndex(-1);
    } else if (event.key === "Enter" && filteredLanguageOptions.length) {
      event.preventDefault();
      handleLanguageChange(
        filteredLanguageOptions[languageMenuIndex] ||
          filteredLanguageOptions[0],
      );
    }
  };

  const handleCopyCode = async () => {
    if (!code.trim()) {
      showToast("Editor is empty", "warning");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      showToast("Code copied", "success");
    } catch {
      showToast("Couldn't copy to clipboard", "error");
    }
  };

  const handleDownloadCode = () => {
    if (!code.trim()) {
      showToast("Editor is empty", "warning");
      return;
    }

    try {
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = getFileName(activeLanguageOption);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      showToast(`Saved ${getFileName(activeLanguageOption)}`, "success");
    } catch {
      showToast("Couldn't download the file", "error");
    }
  };

  const handleResetCode = () => {
    const starterCode = getDefaultCode(selectedLanguage);
    if (code === starterCode) {
      showToast("Already on the starter template", "info");
      return;
    }

    setLastClearedCode(code);
    setCode(starterCode);
    showToast("Starter template restored. Undo is available.", "info");
  };

  const handleCopyOutput = async () => {
    if (!output || runState === "running") {
      showToast("Nothing to copy yet", "warning");
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      showToast("Output copied", "success");
    } catch {
      showToast("Couldn't copy to clipboard", "error");
    }
  };

  const handleClearOutput = () => {
    setOutput("");
    setRunState("idle");
  };

  const handleRun = async () => {
    if (isRunning) {
      return;
    }

    setConsoleTab("output");

    if (!isSupported) {
      setRunState("error");
      setOutput("This language isn't supported. Pick one from the menu above.");
      showToast("Pick a supported language", "warning");
      return;
    }

    if (!code.trim()) {
      setRunState("error");
      setOutput("The editor is empty. Write some code and run again.");
      showToast("Write some code first", "warning");
      return;
    }

    const runtimeInput = stdin;
    if (!runtimeInput.trim() && needsInput(code)) {
      setConsoleTab("input");
      setRunState("error");
      setOutput(
        "This program reads input, but the Input tab is empty.\n\nAdd the values it expects, then run again.",
      );
      showToast("Add input, then run again", "warning");
      return;
    }

    setRunState("running");
    setOutput("");
    const startedAt = performance.now();

    try {
      const response = await fetch(`${API_BASE_URL}/api/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          languageId: selectedLanguage.id,
          sourceCode: code,
          stdin: runtimeInput,
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      const durationMs = performance.now() - startedAt;
      setLastRunDuration(durationMs);
      setLastRunAt(Date.now());

      if (!response.ok) {
        setRunState("error");
        setOutput(data.error || "Execution failed.");
        return;
      }

      const finalOutput =
        typeof data.output === "string" && data.output.trim() !== ""
          ? data.output
          : data.status?.description
            ? `(${data.status.description})`
            : "(Finished with no output)";

      setOutput(finalOutput);
      setRunState("success");
    } catch (error) {
      setLastRunDuration(performance.now() - startedAt);
      setLastRunAt(Date.now());
      setRunState("error");
      setOutput(
        error.message === "Failed to fetch"
          ? "Couldn't reach the server. Check your connection and try again."
          : error.message || "Unable to connect to backend.",
      );
    }
  };

  // Keep Monaco's Ctrl/Cmd+Enter command pointed at the latest handleRun.
  useEffect(() => {
    runRef.current = handleRun;
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isLanguageMenuOpen) {
        setIsLanguageMenuOpen(false);
        return;
      }

      const targetElement =
        event.target instanceof HTMLElement ? event.target : null;
      const isTextInputElement =
        targetElement instanceof HTMLInputElement ||
        targetElement instanceof HTMLTextAreaElement;
      const isMonacoInput =
        isTextInputElement && targetElement.classList.contains("inputarea");

      const hasModifier = event.ctrlKey || event.metaKey;
      if (!hasModifier) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "enter") {
        // Inside Monaco, the command registered in onMount handles this.
        if (isMonacoInput) {
          return;
        }

        event.preventDefault();
        handleRun();
        return;
      }

      if (!event.shiftKey && key === "z") {
        if (lastClearedCode !== null) {
          if (isTextInputElement && !isMonacoInput) {
            return;
          }

          event.preventDefault();
          handleUndoClear();
        }
        return;
      }

      if (event.shiftKey && key === "k") {
        event.preventDefault();
        handleClearCode();
        return;
      }

      if (event.shiftKey && key === "c") {
        event.preventDefault();
        handleCopyCode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    code,
    stdin,
    isSupported,
    lastClearedCode,
    output,
    language,
    isLanguageMenuOpen,
    runState,
  ]);

  // --- Resizable split between editor and console ---------------------------

  const isSideBySide = () => window.matchMedia("(min-width: 1024px)").matches;

  const handleResizeStart = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handleResizeMove = (event) => {
    if (!isDragging || !layoutRef.current) {
      return;
    }

    const rect = layoutRef.current.getBoundingClientRect();
    const percent = isSideBySide()
      ? ((event.clientX - rect.left) / rect.width) * 100
      : ((event.clientY - rect.top) / rect.height) * 100;

    setSplit(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, percent)));
  };

  const handleResizeEnd = () => {
    setIsDragging(false);
    try {
      window.localStorage.setItem(SPLIT_STORAGE_KEY, String(split));
    } catch {
      /* storage unavailable */
    }
  };

  const handleResizeKeyDown = (event) => {
    const step = event.shiftKey ? 8 : 3;
    const back = isSideBySide() ? "ArrowLeft" : "ArrowUp";
    const forward = isSideBySide() ? "ArrowRight" : "ArrowDown";

    if (event.key !== back && event.key !== forward) {
      return;
    }

    event.preventDefault();
    const next = Math.min(
      MAX_SPLIT,
      Math.max(MIN_SPLIT, split + (event.key === forward ? step : -step)),
    );
    setSplit(next);
    try {
      window.localStorage.setItem(SPLIT_STORAGE_KEY, String(next));
    } catch {
      /* storage unavailable */
    }
  };

  const consoleTabClass = (tab) =>
    `relative h-full px-3 text-[13px] font-medium transition-colors ${
      consoleTab === tab ? "text-ink" : "text-ink-3 hover:text-ink-2"
    }`;

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg text-ink">
      <header className="relative z-20 shrink-0 h-14 flex items-center justify-between gap-3 px-3 sm:px-4 border-b border-line bg-bg">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center w-9 h-9 rounded-md text-ink hover:bg-ink/5 transition-colors"
            aria-label="CodeRun home"
            title="All languages"
          >
            <Logo className="w-5 h-5" />
          </button>

          <span className="text-line-strong select-none" aria-hidden="true">
            /
          </span>

          <div className="relative min-w-0" ref={languageMenuRef}>
            <button
              onClick={() => {
                setIsLanguageMenuOpen((open) => !open);
                setLanguageSearchQuery("");
                setLanguageMenuIndex(0);
              }}
              className="flex items-center gap-2 h-9 px-2.5 rounded-md hover:bg-ink/5 transition-colors max-w-full"
              aria-haspopup="listbox"
              aria-expanded={isLanguageMenuOpen}
              title="Change language"
            >
              <LanguageIcon
                language={activeLanguageOption}
                className="w-4 h-4 shrink-0"
              />
              <span className="text-sm font-medium truncate">
                {activeLanguageOption.label}
              </span>
              {activeLanguageOption.runtime && (
                <span className="hidden md:inline text-xs text-ink-3 truncate">
                  {activeLanguageOption.runtime}
                </span>
              )}
              <LuChevronDown
                className={`w-3.5 h-3.5 shrink-0 text-ink-3 transition-transform ${
                  isLanguageMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isLanguageMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-[380px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-line-strong bg-raised shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)] overflow-hidden z-40">
                <input
                  ref={languageSearchRef}
                  value={languageSearchQuery}
                  onChange={(event) => {
                    setLanguageSearchQuery(event.target.value);
                    setLanguageMenuIndex(0);
                  }}
                  onKeyDown={handleLanguageSearchKeyDown}
                  placeholder="Switch language…"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full h-11 px-4 text-sm bg-transparent border-b border-line placeholder:text-ink-3"
                />

                <div
                  ref={languageListRef}
                  role="listbox"
                  className="p-1.5 max-h-80 overflow-y-auto"
                >
                  {filteredLanguageOptions.length ? (
                    filteredLanguageOptions.map((option, index) => {
                      const isCurrent = option.id === activeLanguageOption.id;
                      const isHighlighted = index === languageMenuIndex;

                      return (
                        <button
                          key={option.id}
                          data-index={index}
                          role="option"
                          aria-selected={isCurrent}
                          onClick={() => handleLanguageChange(option)}
                          onMouseMove={() => setLanguageMenuIndex(index)}
                          className={`w-full h-9 px-2.5 rounded-md flex items-center gap-3 text-left text-sm ${
                            isHighlighted ? "bg-ink/8" : ""
                          }`}
                        >
                          <LanguageIcon
                            language={option}
                            className="w-4 h-4 shrink-0 text-ink-2"
                          />
                          <span className="font-medium">{option.label}</span>
                          <span className="flex-1 truncate text-xs text-ink-3">
                            {option.runtime}
                          </span>
                          {isCurrent && (
                            <LuCheck className="w-4 h-4 text-accent" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-6 text-sm text-center text-ink-3">
                      No language matches “{languageSearchQuery}”.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />

          <button
            onClick={handleRun}
            disabled={!isSupported || isRunning}
            className="inline-flex items-center gap-2 h-9 pl-3.5 pr-3 rounded-lg text-sm font-semibold bg-accent text-accent-ink hover:bg-accent-hover active:translate-y-px transition-colors disabled:bg-line-strong disabled:text-ink-3 disabled:active:translate-y-0"
            title={`Run (${MOD_KEY}+Enter)`}
          >
            {isRunning ? (
              <LuLoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <LuPlay className="w-4 h-4 fill-current" />
            )}
            {isRunning ? "Running" : "Run"}
            <span className="hidden md:inline text-[11px] font-mono font-normal opacity-70">
              {MOD_KEY}↵
            </span>
          </button>
        </div>
      </header>

      <div
        ref={layoutRef}
        className={`flex flex-col lg:flex-row flex-1 min-h-0 ${
          isDragging ? "select-none" : ""
        }`}
      >
        {/* Editor pane */}
        <section
          className="flex flex-col min-w-0 min-h-0 shrink-0 grow-0 bg-surface"
          style={{ flexBasis: `${split}%` }}
          aria-label="Code editor"
        >
          <div className="shrink-0 h-10 flex items-center justify-between pl-4 pr-2 border-b border-line">
            <div className="flex items-center gap-2 min-w-0 text-[13px]">
              <span className="font-mono text-ink truncate">
                {getFileName(activeLanguageOption)}
              </span>
              {!isSupported && (
                <span className="inline-flex items-center gap-1 text-xs text-warn">
                  <LuTriangleAlert className="w-3.5 h-3.5" />
                  Can't run this language
                </span>
              )}
            </div>

            <div className="flex items-center">
              {lastClearedCode !== null && (
                <button
                  onClick={handleUndoClear}
                  className="inline-flex items-center gap-1.5 h-[30px] px-2.5 mr-1 rounded-md text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                  title={`Undo (${MOD_KEY}+Z)`}
                >
                  <LuUndo2 className="w-3.5 h-3.5" />
                  Undo
                </button>
              )}
              <button
                onClick={handleCopyCode}
                className="icon-btn"
                aria-label="Copy code"
                title={`Copy code (${MOD_KEY}+Shift+C)`}
              >
                <LuCopy className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownloadCode}
                className="icon-btn"
                aria-label="Download file"
                title="Download file"
              >
                <LuDownload className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-line-strong mx-1" aria-hidden="true" />
              <button
                onClick={handleResetCode}
                className="icon-btn"
                aria-label="Reset to starter template"
                title="Reset to starter template"
              >
                <LuRotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearCode}
                disabled={!code}
                className="icon-btn"
                aria-label="Clear editor"
                title={`Clear editor (${MOD_KEY}+Shift+K)`}
              >
                <LuEraser className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <MonacoEditor
              language={activeLanguageOption.monacoLanguage}
              theme={isDarkTheme ? "coderun-dark" : "coderun-light"}
              value={code}
              onChange={(val) => setCode(val || "")}
              beforeMount={defineMonacoThemes}
              onMount={(editor, monaco) => {
                // Monaco binds Ctrl/Cmd+Enter to "insert line below". Take it
                // over so the shortcut runs the code; plain Enter is untouched.
                editor.addCommand(
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                  () => runRef.current?.(),
                );

                // The mono font loads async; re-measure so the caret lines up.
                document.fonts?.ready.then(() =>
                  monaco.editor.remeasureFonts(),
                );
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13.5,
                fontFamily:
                  "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
                fontLigatures: true,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 14, bottom: 14 },
                lineHeight: 22,
                lineNumbersMinChars: 3,
                renderLineHighlight: "line",
                bracketPairColorization: { enabled: true },
                cursorBlinking: "smooth",
                smoothScrolling: true,
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                overviewRulerBorder: false,
                scrollbar: { verticalScrollbarSize: 10 },
                contextmenu: true,
              }}
              loading={
                <div className="flex items-center gap-2 text-sm text-ink-3">
                  <LuLoaderCircle className="w-4 h-4 animate-spin" />
                  Loading editor…
                </div>
              }
            />
          </div>
        </section>

        {/* Drag handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor and console"
          aria-valuenow={Math.round(split)}
          aria-valuemin={MIN_SPLIT}
          aria-valuemax={MAX_SPLIT}
          tabIndex={0}
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onKeyDown={handleResizeKeyDown}
          className={`group relative shrink-0 touch-none bg-line transition-colors h-px lg:h-auto lg:w-px hover:bg-accent focus-visible:bg-accent ${
            isDragging ? "bg-accent" : ""
          }`}
        >
          {/* Larger invisible hit area */}
          <span className="absolute inset-x-0 -top-1.5 -bottom-1.5 lg:inset-y-0 lg:-left-1.5 lg:-right-1.5 lg:top-0 lg:bottom-0 cursor-row-resize lg:cursor-col-resize" />
        </div>

        {/* Console pane */}
        <section
          className="flex flex-col flex-1 min-w-0 min-h-0 bg-bg"
          aria-label="Console"
        >
          <div className="shrink-0 h-10 flex items-center justify-between pl-1 pr-2 border-b border-line">
            <div className="flex items-center h-full" role="tablist">
              <button
                role="tab"
                aria-selected={consoleTab === "output"}
                onClick={() => setConsoleTab("output")}
                className={consoleTabClass("output")}
              >
                Output
                {consoleTab === "output" && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent rounded-full" />
                )}
              </button>
              <button
                role="tab"
                aria-selected={consoleTab === "input"}
                onClick={() => setConsoleTab("input")}
                className={consoleTabClass("input")}
              >
                Input
                {stdin.trim() && (
                  <span
                    className="inline-block ml-1.5 w-1.5 h-1.5 rounded-full bg-accent align-middle"
                    title="Has content"
                  />
                )}
                {consoleTab === "input" && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent rounded-full" />
                )}
              </button>
            </div>

            {consoleTab === "output" && (
              <div className="flex items-center">
                <button
                  onClick={handleCopyOutput}
                  disabled={!output}
                  className="icon-btn"
                  aria-label="Copy output"
                  title="Copy output"
                >
                  <LuCopy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClearOutput}
                  disabled={!output}
                  className="icon-btn"
                  aria-label="Clear output"
                  title="Clear output"
                >
                  <LuEraser className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {consoleTab === "input" ? (
              <div className="flex-1 min-h-0 flex flex-col p-4 gap-2">
                <p className="text-xs text-ink-3">
                  Sent to your program's standard input. Separate values with
                  spaces or new lines.
                </p>
                <textarea
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                  placeholder="e.g. 5&#10;10 20 30"
                  spellCheck={false}
                  className="flex-1 min-h-0 w-full resize-none rounded-lg border border-line-strong bg-raised p-3 font-mono text-[13px] leading-6 placeholder:text-ink-3 focus:border-accent"
                />
              </div>
            ) : (
              <div
                className="flex-1 min-h-0 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-6"
                aria-live="polite"
              >
                {runState === "running" ? (
                  <p className="flex items-center gap-2 text-ink-3">
                    <LuLoaderCircle className="w-4 h-4 animate-spin" />
                    Compiling and running…
                  </p>
                ) : output ? (
                  <pre
                    className={`whitespace-pre-wrap break-words font-[inherit] ${
                      runState === "error" ? "text-bad" : "text-ink"
                    }`}
                  >
                    {output}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center font-sans select-none">
                    <LuTerminal className="w-6 h-6 text-ink-3" />
                    <p className="text-sm text-ink-3">
                      Run your code to see its output here.
                      <br />
                      <span className="kbd">{MOD_KEY}</span>{" "}
                      <span className="kbd">Enter</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 h-8 flex items-center gap-2 px-4 border-t border-line text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${runStateMeta.dot}`} />
            <span className={runStateMeta.text}>{runStateMeta.label}</span>
            {lastRunDuration !== null && runState !== "running" && (
              <span className="text-ink-3 font-mono">
                {formatDuration(lastRunDuration)}
                {lastRunAt &&
                  ` · ${new Date(lastRunAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
              </span>
            )}
          </div>
        </section>
      </div>

      <footer className="shrink-0 h-7 hidden sm:flex items-center justify-between px-4 border-t border-line bg-bg text-[11px] font-mono text-ink-3">
        <span>
          {lineCount} {lineCount === 1 ? "line" : "lines"} ·{" "}
          {charCount.toLocaleString()} chars
        </span>
        <span className="flex items-center gap-1.5">
          <LuCheck className="w-3 h-3 text-ok" />
          Saved in this browser
        </span>
      </footer>

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="toast-in fixed left-1/2 bottom-12 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-lg bg-ink text-bg px-3.5 py-2.5 text-sm shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)]"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${TOAST_DOT[toast.tone] || TOAST_DOT.info}`}
          />
          {toast.message}
        </div>
      )}
    </div>
  );
}
