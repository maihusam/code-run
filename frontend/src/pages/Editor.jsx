import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MonacoEditor from "@monaco-editor/react";
import { useTheme } from "../hooks/useTheme";
import {
  VscPlay,
  VscChevronLeft,
  VscChevronDown,
  VscTerminal,
  VscClearAll,
  VscHistory,
  VscCopy,
  VscCloudDownload,
  VscRefresh,
  VscCheck,
  VscWarning,
  VscInfo,
  VscCode,
  VscClose,
} from "react-icons/vsc";
import { BiLoaderAlt } from "react-icons/bi";
import { getLanguageByRouteParam, searchLanguages } from "../data/languages";
import { getLanguageVisual } from "../data/languageVisuals";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");
const STORAGE_KEY_PREFIX = "code-run.editor";
const AUTOSAVE_DELAY_MS = 250;
const TOAST_TIMEOUT_MS = 2200;

const QUICK_OPEN_PLACEHOLDER = "Type . to start or paste Path";

const RUN_STATE_META = {
  idle: {
    label: "Idle",
    className:
      "border-slate-300 bg-slate-100 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
    icon: VscInfo,
  },
  running: {
    label: "Running",
    className:
      "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300",
    icon: BiLoaderAlt,
  },
  success: {
    label: "Success",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
    icon: VscCheck,
  },
  error: {
    label: "Error",
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300",
    icon: VscWarning,
  },
};

const TOAST_META = {
  info: {
    className:
      "border-slate-200 bg-white text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200",
    icon: VscInfo,
  },
  success: {
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
    icon: VscCheck,
  },
  warning: {
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
    icon: VscWarning,
  },
  error: {
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300",
    icon: VscWarning,
  },
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

const getPreviousCodeStorageKey = (languageStorageKey) =>
  `${STORAGE_KEY_PREFIX}.${languageStorageKey}.previous`;

const getStoredCode = (languageStorageKey, fallbackCode) => {
  if (typeof window === "undefined") {
    return fallbackCode;
  }

  try {
    const savedCode = window.localStorage.getItem(
      getCodeStorageKey(languageStorageKey),
    );
    return savedCode !== null ? savedCode : fallbackCode;
  } catch {
    return fallbackCode;
  }
};

const getStoredPreviousCode = (languageStorageKey) => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const previousCode = window.localStorage.getItem(
      getPreviousCodeStorageKey(languageStorageKey),
    );
    return previousCode !== null ? previousCode : null;
  } catch {
    return null;
  }
};

const getSaveLabel = () => "Auto-saved";

const formatDuration = (durationMs) => {
  if (durationMs < 1000) {
    return `${Math.max(1, Math.round(durationMs))}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
};

export default function Editor() {
  const { language } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const languageMenuRef = useRef(null);
  const selectedLanguage = getLanguageByRouteParam(language);
  const languageStorageKey = selectedLanguage
    ? selectedLanguage.routeValue
    : String(language || "unknown");

  const [code, setCode] = useState(() =>
    getStoredCode(languageStorageKey, getDefaultCode(selectedLanguage)),
  );
  const [lastSnapshotCode, setLastSnapshotCode] = useState(() =>
    getStoredPreviousCode(languageStorageKey),
  );
  const [lastClearedCode, setLastClearedCode] = useState(null);
  const [toast, setToast] = useState(null);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");

  const [stdin, setStdin] = useState("");
  const [isStdinOpen, setIsStdinOpen] = useState(false);
  const [output, setOutput] = useState("");
  const [runState, setRunState] = useState("idle");
  const [lastRunDuration, setLastRunDuration] = useState(null);
  const [lastRunAt, setLastRunAt] = useState(null);
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
  const groupedLanguageOptions = useMemo(() => {
    const groupsMap = new Map();

    filteredLanguageOptions.forEach((languageOption) => {
      const key = languageOption.label.toLowerCase();
      const existingGroup = groupsMap.get(key);

      if (existingGroup) {
        existingGroup.options.push(languageOption);
        return;
      }

      groupsMap.set(key, {
        key,
        label: languageOption.label,
        options: [languageOption],
      });
    });

    return Array.from(groupsMap.values());
  }, [filteredLanguageOptions]);
  const activeLanguageVisual = getLanguageVisual(
    activeLanguageOption,
    isDarkTheme,
  );
  const ActiveLanguageIcon = activeLanguageVisual.Icon;
  const lineCount = code ? code.split(/\r\n|\r|\n/).length : 0;
  const charCount = code.length;

  const runStateMeta = RUN_STATE_META[runState] || RUN_STATE_META.idle;
  const RunStateIcon = runStateMeta.icon;
  const toastMeta = toast
    ? TOAST_META[toast.tone] || TOAST_META.info
    : TOAST_META.info;
  const ToastIcon = toastMeta.icon;

  const actionButtonBase =
    "flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 dark:focus:ring-offset-[#101010]";

  const utilityButtonBase =
    "flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 dark:focus:ring-offset-[#0f0f0f]";

  const showToast = (message, tone = "info") => {
    setToast({ id: Date.now(), message, tone });
  };

  useEffect(() => {
    const fallbackCode = getDefaultCode(selectedLanguage);
    setCode(getStoredCode(languageStorageKey, fallbackCode));
    setLastSnapshotCode(getStoredPreviousCode(languageStorageKey));
    setLastClearedCode(null);
    setIsLanguageMenuOpen(false);
    setLanguageSearchQuery("");
    setStdin("");
    setIsStdinOpen(false);
    setOutput("");
    setRunState("idle");
    setLastRunDuration(null);
    setLastRunAt(null);
  }, [languageStorageKey, selectedLanguage]);

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return;
    }

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
    if (typeof window === "undefined") {
      return;
    }

    const persistTimer = window.setTimeout(() => {
      try {
        const storageKey = getCodeStorageKey(languageStorageKey);
        const previousCode = window.localStorage.getItem(storageKey);

        if (previousCode !== null && previousCode !== code) {
          window.localStorage.setItem(
            getPreviousCodeStorageKey(languageStorageKey),
            previousCode,
          );
          setLastSnapshotCode(previousCode);
        }

        window.localStorage.setItem(storageKey, code);
      } catch {}
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
    showToast("Editor cleared", "warning");
  };

  const handleUndoClear = () => {
    if (lastClearedCode === null) {
      return;
    }

    setCode(lastClearedCode);
    setLastClearedCode(null);
    showToast("Clear action undone", "success");
  };

  const handleRestoreLastCode = () => {
    if (lastSnapshotCode === null) {
      showToast("No previous code available yet", "warning");
      return;
    }

    if (lastSnapshotCode === code) {
      showToast("Already showing the previous code", "info");
      return;
    }

    setCode(lastSnapshotCode);
    setLastClearedCode(null);
    showToast("Previous code restored", "success");
  };

  const handleLanguageChange = (nextLanguage) => {
    if (!nextLanguage || nextLanguage.id === activeLanguageOption.id) {
      setIsLanguageMenuOpen(false);
      return;
    }

    setIsLanguageMenuOpen(false);
    navigate(`/editor/${nextLanguage.routeValue}`);
    showToast(`Switched to ${nextLanguage.label}`, "info");
  };

  const handleLanguageSearchKeyDown = (event) => {
    if (event.key === "Enter" && filteredLanguageOptions.length) {
      event.preventDefault();
      handleLanguageChange(filteredLanguageOptions[0]);
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
      showToast("Unable to copy code", "error");
    }
  };

  const handleDownloadCode = () => {
    if (!code.trim()) {
      showToast("Editor is empty", "warning");
      return;
    }

    try {
      const extension = activeLanguageOption.extension || "txt";
      const filePrefix = activeLanguageOption.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const fileName = `${filePrefix || "code"}-snippet.${extension}`;
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      showToast("Code downloaded", "success");
    } catch {
      showToast("Unable to download code", "error");
    }
  };

  const handleResetCode = () => {
    const starterCode = getDefaultCode(selectedLanguage);
    if (code === starterCode) {
      showToast("Already using starter template", "info");
      return;
    }

    setLastClearedCode(code);
    setCode(starterCode);
    showToast("Starter template restored", "info");
  };

  const handleCopyOutput = async () => {
    if (!output || output === "Running...") {
      showToast("Nothing to copy", "warning");
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      showToast("Output copied", "success");
    } catch {
      showToast("Unable to copy output", "error");
    }
  };

  const handleRun = async () => {
    if (!isSupported) {
      setRunState("error");
      setOutput("Choose a valid language to run your code.");
      showToast("Select a valid language", "warning");
      return;
    }

    if (!code.trim()) {
      setRunState("error");
      setOutput("Editor is empty. Add code and run again.");
      showToast("Write some code first", "warning");
      return;
    }

    let runtimeInput = stdin;
    if (!runtimeInput.trim() && needsInput(code)) {
      setIsStdinOpen(true);
      setRunState("error");
      setOutput(
        "Your code requires input to run.\n\nPlease enter the required values in the Input pane below and click Run again.",
      );
      showToast("Please provide input and try again.", "warning");
      return;
    }

    setRunState("running");
    setOutput("Running...");
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
        showToast("Execution failed", "error");
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
      showToast(`Run complete in ${formatDuration(durationMs)}`, "success");
    } catch (error) {
      const durationMs = performance.now() - startedAt;
      setLastRunDuration(durationMs);
      setLastRunAt(Date.now());
      setRunState("error");
      setOutput(error.message || "Unable to connect to backend.");
      showToast("Unable to connect to backend", "error");
    }
  };

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
  ]);

  return (
    <div className="relative flex flex-col h-[100dvh] overflow-hidden bg-slate-100 dark:bg-[#070707] text-slate-900 dark:text-white font-sans transition-colors duration-300 selection:bg-indigo-100 dark:selection:bg-indigo-900/50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.08),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_45%)]"></div>

      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm ${toastMeta.className}`}
          >
            <ToastIcon className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-medium">
              {toast.message}
            </span>
            <button
              onClick={() => setToast(null)}
              className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Dismiss notice"
            >
              <VscClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <header className="relative z-20 px-4 sm:px-5 py-3 bg-white/90 dark:bg-[#101010]/90 backdrop-blur-md border-b border-slate-200 dark:border-neutral-800/80 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-4 min-w-0">
            <button
              onClick={() => navigate("/")}
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white transition-colors group"
            >
              <VscChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Workspace</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-neutral-800 hidden sm:block"></div>

            <div className="flex items-center gap-2 min-w-0">
              <div className="relative" ref={languageMenuRef}>
                <button
                  onClick={() => {
                    setIsLanguageMenuOpen((open) => !open);
                    setLanguageSearchQuery("");
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 dark:border-neutral-700/70 bg-white/90 dark:bg-neutral-900/70 px-2 py-1.5 shadow-sm hover:border-slate-300 dark:hover:border-neutral-600 transition-colors"
                  aria-haspopup="listbox"
                  aria-expanded={isLanguageMenuOpen}
                  title="Change language"
                >
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border"
                    style={activeLanguageVisual.badgeStyle}
                  >
                    <ActiveLanguageIcon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-neutral-100 truncate max-w-[120px] sm:max-w-none">
                    {activeLanguageOption.label}
                  </span>
                  <span className="hidden md:inline text-[10px] text-slate-500 dark:text-neutral-400 truncate max-w-[150px]">
                    {activeLanguageOption.runtime || "Standard"}
                  </span>
                  <VscChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 dark:text-neutral-400 transition-transform ${
                      isLanguageMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isLanguageMenuOpen && (
                  <div className="absolute left-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#151515] shadow-xl overflow-hidden z-40">
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-neutral-700 text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                      Switch language
                    </div>

                    <div className="px-3 py-2 border-b border-slate-200 dark:border-neutral-700">
                      <input
                        value={languageSearchQuery}
                        onChange={(event) =>
                          setLanguageSearchQuery(event.target.value)
                        }
                        onKeyDown={handleLanguageSearchKeyDown}
                        placeholder={QUICK_OPEN_PLACEHOLDER}
                        className="w-full rounded-md border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#0f0f0f] px-2.5 py-1.5 text-xs text-slate-700 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div
                      role="listbox"
                      className="py-1 max-h-80 overflow-y-auto"
                    >
                      {groupedLanguageOptions.length ? (
                        groupedLanguageOptions.map((group) => (
                          <div key={group.key} className="py-1">
                            {group.options.length > 1 && (
                              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                                {group.label}
                              </div>
                            )}

                            {group.options.map((option) => {
                              const isActive =
                                option.id === activeLanguageOption.id;
                              const optionVisual = getLanguageVisual(
                                option,
                                isDarkTheme,
                              );
                              const OptionIcon = optionVisual.Icon;

                              return (
                                <button
                                  key={option.id}
                                  onClick={() => handleLanguageChange(option)}
                                  className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors ${
                                    isActive
                                      ? "bg-indigo-50 dark:bg-indigo-500/15"
                                      : "hover:bg-slate-50 dark:hover:bg-neutral-800"
                                  }`}
                                >
                                  <span
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border"
                                    style={optionVisual.badgeStyle}
                                  >
                                    <OptionIcon className="w-4 h-4" />
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-xs font-medium text-slate-700 dark:text-neutral-200 truncate">
                                      {option.label}
                                    </span>
                                    <span className="block text-[10px] text-slate-500 dark:text-neutral-400 truncate">
                                      {option.runtime || "Standard"}
                                    </span>
                                  </span>
                                  {isActive && (
                                    <VscCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-5 text-xs text-center text-slate-500 dark:text-neutral-400">
                          No languages matched your search.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!isSupported && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 text-[10px] uppercase tracking-wide">
                  <VscWarning className="w-3 h-3" />
                  Read only run
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg
                  className="w-[18px] h-[18px]"
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
                  className="w-[18px] h-[18px]"
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
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900">
              <VscCheck className="w-3.5 h-3.5 text-emerald-500" />
              {getSaveLabel()}
            </span>
            {lastRunDuration !== null && (
              <span className="hidden sm:inline text-slate-500 dark:text-neutral-400">
                Last run {formatDuration(lastRunDuration)}
                {lastRunAt
                  ? ` at ${new Date(lastRunAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-col lg:flex-row flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-neutral-800 h-1/2 lg:h-full bg-white/85 dark:bg-[#0d0d0d]/90 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200/80 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-neutral-400 uppercase tracking-wide">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700">
                <VscCode className="w-3.5 h-3.5" />
                {lineCount} lines
              </span>
              <span className="hidden sm:inline">{charCount} chars</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={handleRun}
                disabled={!isSupported || isRunning}
                className={`${actionButtonBase} ${
                  !isSupported
                    ? "bg-slate-100/50 dark:bg-neutral-800/30 text-slate-400 dark:text-neutral-600 cursor-not-allowed border-slate-200 dark:border-neutral-800"
                    : isRunning
                      ? "bg-indigo-500/90 border-indigo-500 text-white cursor-wait"
                      : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 active:scale-[0.98] shadow-sm"
                }`}
              >
                {isRunning ? (
                  <>
                    <BiLoaderAlt className="w-3.5 h-3.5 animate-spin text-white/80" />
                    <span>Running</span>
                  </>
                ) : (
                  <>
                    <VscPlay className="w-3.5 h-3.5" />
                    <span>Run</span>
                  </>
                )}
              </button>

              <button
                onClick={handleRestoreLastCode}
                disabled={
                  lastSnapshotCode === null || lastSnapshotCode === code
                }
                className={`${utilityButtonBase} ${
                  lastSnapshotCode !== null && lastSnapshotCode !== code
                    ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700"
                    : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-neutral-800 dark:text-neutral-600 dark:border-neutral-700 cursor-not-allowed"
                }`}
                title="Restore previous code"
              >
                <VscHistory className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Last Code</span>
              </button>

              <button
                onClick={handleCopyCode}
                className={`${utilityButtonBase} bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700`}
                title="Copy code"
              >
                <VscCopy className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Copy</span>
              </button>

              <button
                onClick={handleDownloadCode}
                className={`${utilityButtonBase} bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700`}
                title="Download code"
              >
                <VscCloudDownload className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Export</span>
              </button>

              <button
                onClick={handleResetCode}
                className={`${utilityButtonBase} bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/20`}
                title="Restore starter template"
              >
                <VscRefresh className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset</span>
              </button>

              <button
                onClick={handleClearCode}
                disabled={!code}
                className={`${utilityButtonBase} ${
                  code
                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30 dark:hover:bg-rose-500/20"
                    : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-neutral-800 dark:text-neutral-600 dark:border-neutral-700 cursor-not-allowed"
                }`}
                title="Clear editor"
              >
                <VscClearAll className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Clear</span>
              </button>

              {lastClearedCode !== null && (
                <button
                  onClick={handleUndoClear}
                  className={`${utilityButtonBase} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/20`}
                  title="Undo clear"
                >
                  <VscHistory className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Undo</span>
                </button>
              )}
            </div>
          </div>

          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            {!isSupported && (
              <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-[11px] font-medium px-3 py-1.5 rounded flex items-center shadow-sm backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2 animate-pulse"></span>
                Execution unsupported
              </div>
            )}
          </div>

          <div className="flex-1 w-full">
            <MonacoEditor
              language={activeLanguageOption.monacoLanguage}
              theme={theme === "dark" ? "vs-dark" : "light"}
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily:
                  "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                fontLigatures: true,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                lineHeight: 24,
                renderLineHighlight: "all",
                bracketPairColorization: { enabled: true },
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
                contextmenu: true,
              }}
              loading={
                <div className="flex items-center justify-center p-8 text-sm text-slate-400 dark:text-neutral-600 flex-col gap-3">
                  <BiLoaderAlt className="w-6 h-6 animate-spin" />
                  Loading editor core...
                </div>
              }
            />
          </div>
        </div>

        <div className="flex-1 lg:min-w-[390px] lg:max-w-[500px] flex flex-col h-1/2 lg:h-full bg-slate-50/80 dark:bg-[#111111]/95 z-0 transition-colors border-l border-slate-200/80 dark:border-neutral-800">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-neutral-800 bg-white/70 dark:bg-[#111111]">
            <h2 className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 tracking-wider flex items-center gap-1.5 uppercase">
              <VscTerminal className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              Console
            </h2>

            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${runStateMeta.className}`}
              >
                <RunStateIcon
                  className={`w-3.5 h-3.5 ${runState === "running" ? "animate-spin" : ""}`}
                />
                {runStateMeta.label}
              </span>

              <button
                onClick={() => setIsStdinOpen((open) => !open)}
                className="px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                title="Toggle stdin"
              >
                {isStdinOpen ? "Hide Input" : "Input"}
              </button>

              <button
                onClick={handleCopyOutput}
                className="px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                title="Copy output"
              >
                Copy
              </button>

              {output && (
                <button
                  onClick={() => {
                    setOutput("");
                    setRunState("idle");
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 transition-colors"
                  title="Clear output"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {isStdinOpen && (
            <div className="px-4 py-3 border-b border-slate-200 dark:border-neutral-800 bg-slate-100/60 dark:bg-neutral-900/40">
              <label className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 tracking-wider uppercase">
                Stdin
              </label>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-neutral-500">
                Provide runtime input. Separate values with spaces or new lines.
              </p>
              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                rows={4}
                placeholder="Enter input here..."
                className="mt-2 w-full resize-none rounded-md border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#111111] px-3 py-2 font-mono text-xs text-slate-800 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          )}

          <div className="flex-1 p-4 font-mono text-[13px] leading-6 overflow-y-auto w-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0.4),rgba(248,250,252,0.9))] dark:bg-[linear-gradient(to_bottom,rgba(17,17,17,0.9),rgba(10,10,10,0.95))]">
            {output ? (
              <div
                className={`whitespace-pre-wrap break-words ${
                  runState === "error"
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-slate-800 dark:text-neutral-300"
                }`}
              >
                {output}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-neutral-600/70 select-none">
                <VscTerminal className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs">Output will appear here</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
