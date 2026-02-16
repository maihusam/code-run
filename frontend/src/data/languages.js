const RAW_JUDGE0_LANGUAGES = [
  { id: 45, name: "Assembly (NASM 2.14.02)" },
  { id: 46, name: "Bash (5.0.0)" },
  { id: 47, name: "Basic (FBC 1.07.1)" },
  { id: 75, name: "C (Clang 7.0.1)" },
  { id: 76, name: "C++ (Clang 7.0.1)" },
  { id: 48, name: "C (GCC 7.4.0)" },
  { id: 52, name: "C++ (GCC 7.4.0)" },
  { id: 49, name: "C (GCC 8.3.0)" },
  { id: 53, name: "C++ (GCC 8.3.0)" },
  { id: 50, name: "C (GCC 9.2.0)" },
  { id: 54, name: "C++ (GCC 9.2.0)" },
  { id: 86, name: "Clojure (1.10.1)" },
  { id: 51, name: "C# (Mono 6.6.0.161)" },
  { id: 77, name: "COBOL (GnuCOBOL 2.2)" },
  { id: 55, name: "Common Lisp (SBCL 2.0.0)" },
  { id: 56, name: "D (DMD 2.089.1)" },
  { id: 57, name: "Elixir (1.9.4)" },
  { id: 58, name: "Erlang (OTP 22.2)" },
  { id: 44, name: "Executable" },
  { id: 87, name: "F# (.NET Core SDK 3.1.202)" },
  { id: 59, name: "Fortran (GFortran 9.2.0)" },
  { id: 60, name: "Go (1.13.5)" },
  { id: 88, name: "Groovy (3.0.3)" },
  { id: 61, name: "Haskell (GHC 8.8.1)" },
  { id: 62, name: "Java (OpenJDK 13.0.1)" },
  { id: 63, name: "JavaScript (Node.js 12.14.0)" },
  { id: 78, name: "Kotlin (1.3.70)" },
  { id: 64, name: "Lua (5.3.5)" },
  { id: 89, name: "Multi-file program" },
  { id: 79, name: "Objective-C (Clang 7.0.1)" },
  { id: 65, name: "OCaml (4.09.0)" },
  { id: 66, name: "Octave (5.1.0)" },
  { id: 67, name: "Pascal (FPC 3.0.4)" },
  { id: 85, name: "Perl (5.28.1)" },
  { id: 68, name: "PHP (7.4.1)" },
  { id: 43, name: "Plain Text" },
  { id: 69, name: "Prolog (GNU Prolog 1.4.5)" },
  { id: 70, name: "Python (2.7.17)" },
  { id: 71, name: "Python (3.8.1)" },
  { id: 80, name: "R (4.0.0)" },
  { id: 72, name: "Ruby (2.7.0)" },
  { id: 73, name: "Rust (1.40.0)" },
  { id: 81, name: "Scala (2.13.2)" },
  { id: 82, name: "SQL (SQLite 3.27.2)" },
  { id: 83, name: "Swift (5.2.3)" },
  { id: 74, name: "TypeScript (3.7.4)" },
  { id: 84, name: "Visual Basic.Net (vbnc 0.0.0.5943)" },
];

const POPULAR_LANGUAGE_IDS = new Set([63, 71, 54, 62, 73, 60, 74, 72, 68]);

const LEGACY_ROUTE_ALIASES = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
  rust: 73,
  go: 60,
};

const PREFERRED_VARIANT_BY_LABEL = {
  c: 50,
  "c++": 54,
  python: 71,
};

const LANGUAGE_MODE_MAP = {
  assembly: "asm",
  bash: "shell",
  basic: "vb",
  c: "c",
  "c++": "cpp",
  clojure: "clojure",
  "c#": "csharp",
  cobol: "plaintext",
  "common lisp": "lisp",
  d: "plaintext",
  elixir: "plaintext",
  erlang: "plaintext",
  executable: "plaintext",
  "f#": "fsharp",
  fortran: "plaintext",
  go: "go",
  groovy: "groovy",
  haskell: "haskell",
  java: "java",
  javascript: "javascript",
  kotlin: "kotlin",
  lua: "lua",
  "multi-file program": "plaintext",
  "objective-c": "c",
  ocaml: "ocaml",
  octave: "plaintext",
  pascal: "pascal",
  perl: "perl",
  php: "php",
  "plain text": "plaintext",
  prolog: "plaintext",
  python: "python",
  r: "r",
  ruby: "ruby",
  rust: "rust",
  scala: "scala",
  sql: "sql",
  swift: "swift",
  typescript: "typescript",
  "visual basic.net": "vb",
};

const LANGUAGE_EXTENSION_MAP = {
  assembly: "asm",
  bash: "sh",
  basic: "bas",
  c: "c",
  "c++": "cpp",
  clojure: "clj",
  "c#": "cs",
  cobol: "cbl",
  "common lisp": "lisp",
  d: "d",
  elixir: "exs",
  erlang: "erl",
  executable: "bin",
  "f#": "fsx",
  fortran: "f90",
  go: "go",
  groovy: "groovy",
  haskell: "hs",
  java: "java",
  javascript: "js",
  kotlin: "kt",
  lua: "lua",
  "multi-file program": "txt",
  "objective-c": "m",
  ocaml: "ml",
  octave: "m",
  pascal: "pas",
  perl: "pl",
  php: "php",
  "plain text": "txt",
  prolog: "pro",
  python: "py",
  r: "r",
  ruby: "rb",
  rust: "rs",
  scala: "scala",
  sql: "sql",
  swift: "swift",
  typescript: "ts",
  "visual basic.net": "vb",
};

const STARTER_SNIPPETS = {
  assembly:
    "section .text\nglobal _start\n\n_start:\n  mov rax, 60\n  xor rdi, rdi\n  syscall\n",
  bash: 'echo "Hello, World!"\n',
  basic: 'PRINT "Hello, World!"\n',
  c: '#include <stdio.h>\n\nint main() {\n  printf("Hello, World!\\n");\n  return 0;\n}\n',
  "c++":
    '#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}\n',
  clojure: '(println "Hello, World!")\n',
  "c#": 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello, World!");\n  }\n}\n',
  cobol:
    'IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\nDISPLAY "HELLO, WORLD!".\nSTOP RUN.\n',
  "common lisp": '(format t "Hello, World!~%")\n',
  d: 'import std.stdio;\n\nvoid main() {\n  writeln("Hello, World!");\n}\n',
  elixir: 'IO.puts("Hello, World!")\n',
  erlang:
    '-module(main).\n-export([main/0]).\n\nmain() ->\n  io:format("Hello, World!~n").\n',
  executable: "",
  "f#": 'printfn "Hello, World!"\n',
  fortran: "program hello\n  print *, 'Hello, World!'\nend program hello\n",
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, World!")\n}\n',
  groovy: 'println "Hello, World!"\n',
  haskell: 'main = putStrLn "Hello, World!"\n',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}\n',
  javascript: 'console.log("Hello, World!");\n',
  kotlin: 'fun main() {\n  println("Hello, World!")\n}\n',
  lua: 'print("Hello, World!")\n',
  "multi-file program": "",
  "objective-c":
    '#import <Foundation/Foundation.h>\n\nint main() {\n  @autoreleasepool {\n    NSLog(@"Hello, World!");\n  }\n  return 0;\n}\n',
  ocaml: 'print_endline "Hello, World!";;\n',
  octave: "disp('Hello, World!')\n",
  pascal: "program Hello;\n\nbegin\n  writeln('Hello, World!');\nend.\n",
  perl: 'print "Hello, World!\\n";\n',
  php: '<?php\necho "Hello, World!\\n";\n',
  "plain text": "",
  prolog: "main :- write('Hello, World!'), nl.\n",
  python: 'print("Hello, World!")\n',
  r: 'cat("Hello, World!\\n")\n',
  ruby: 'puts "Hello, World!"\n',
  rust: 'fn main() {\n  println!("Hello, World!");\n}\n',
  scala: 'object Main extends App {\n  println("Hello, World!")\n}\n',
  sql: "SELECT 'Hello, World!';\n",
  swift: 'print("Hello, World!")\n',
  typescript: 'console.log("Hello, World!");\n',
  "visual basic.net":
    'Module Program\n  Sub Main()\n    Console.WriteLine("Hello, World!")\n  End Sub\nEnd Module\n',
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const parseDisplayName = (name) => {
  const match = String(name).match(/^(.+?)\s*\((.+)\)$/);
  if (!match) {
    return { label: name, runtime: "" };
  }

  return {
    label: match[1],
    runtime: match[2],
  };
};

const getBaseKey = (label) => normalize(label);

const getStarterCode = (label) => {
  const key = getBaseKey(label);
  return STARTER_SNIPPETS[key] || "";
};

const getLanguageBadgeText = (label) => {
  const chunks = String(label)
    .split(/[^A-Za-z0-9#+]+/)
    .filter(Boolean);

  if (!chunks.length) {
    return "L";
  }

  if (chunks.length === 1) {
    return chunks[0].slice(0, 2).toUpperCase();
  }

  return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
};

export const LANGUAGE_OPTIONS = RAW_JUDGE0_LANGUAGES.map((entry) => {
  const { label, runtime } = parseDisplayName(entry.name);
  const key = getBaseKey(label);

  return {
    id: entry.id,
    routeValue: String(entry.id),
    fullName: entry.name,
    label,
    runtime,
    badgeText: getLanguageBadgeText(label),
    monacoLanguage: LANGUAGE_MODE_MAP[key] || "plaintext",
    extension: LANGUAGE_EXTENSION_MAP[key] || "txt",
    starterCode: getStarterCode(label),
    isPopular: POPULAR_LANGUAGE_IDS.has(entry.id),
    searchableText: normalize(
      `${entry.id} ${entry.name} ${label} ${runtime} ${LANGUAGE_EXTENSION_MAP[key] || ""}`,
    ),
  };
});

const LANGUAGE_GROUPS_MAP = new Map();

LANGUAGE_OPTIONS.forEach((languageOption) => {
  const groupKey = normalize(languageOption.label);
  const existingGroup = LANGUAGE_GROUPS_MAP.get(groupKey);

  if (existingGroup) {
    existingGroup.options.push(languageOption);
    return;
  }

  LANGUAGE_GROUPS_MAP.set(groupKey, {
    key: groupKey,
    label: languageOption.label,
    options: [languageOption],
  });
});

export const LANGUAGE_GROUPS = Array.from(LANGUAGE_GROUPS_MAP.values()).map(
  (group) => {
    const preferredVariantId = PREFERRED_VARIANT_BY_LABEL[group.key];
    const primaryOption =
      group.options.find((option) => option.id === preferredVariantId) ||
      group.options[group.options.length - 1];
    const variantCount = group.options.length;

    return {
      key: group.key,
      label: group.label,
      options: group.options,
      primaryOption,
      variantCount,
      runtimeSummary:
        variantCount > 1
          ? `${variantCount} variants`
          : primaryOption.runtime || "Ready",
      searchableText: normalize(
        group.options.map((option) => option.searchableText).join(" "),
      ),
    };
  },
);

const LANGUAGE_BY_ID = new Map(
  LANGUAGE_OPTIONS.map((language) => [language.id, language]),
);

const LANGUAGE_GROUP_BY_KEY = new Map(
  LANGUAGE_GROUPS.map((group) => [group.key, group]),
);

const LANGUAGE_GROUP_BY_ID = new Map();
LANGUAGE_GROUPS.forEach((group) => {
  group.options.forEach((languageOption) => {
    LANGUAGE_GROUP_BY_ID.set(languageOption.id, group);
  });
});

export const POPULAR_LANGUAGES = LANGUAGE_OPTIONS.filter(
  (language) => language.isPopular,
);

export const POPULAR_LANGUAGE_GROUPS = LANGUAGE_GROUPS.filter((group) =>
  group.options.some((languageOption) => languageOption.isPopular),
);

export const getLanguageById = (value) => {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    return null;
  }

  return LANGUAGE_BY_ID.get(id) || null;
};

export const getLanguageGroupById = (value) => {
  const languageOption = getLanguageById(value);
  if (!languageOption) {
    return null;
  }

  return LANGUAGE_GROUP_BY_ID.get(languageOption.id) || null;
};

export const getLanguageByRouteParam = (value) => {
  const normalizedValue = normalize(value);
  if (!normalizedValue) {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(LEGACY_ROUTE_ALIASES, normalizedValue)
  ) {
    return getLanguageById(LEGACY_ROUTE_ALIASES[normalizedValue]);
  }

  return getLanguageById(normalizedValue);
};

export const getLanguageGroupByRouteParam = (value) => {
  const languageOption = getLanguageByRouteParam(value);
  if (!languageOption) {
    return null;
  }

  return LANGUAGE_GROUP_BY_KEY.get(normalize(languageOption.label)) || null;
};

const extractExtensionToken = (query) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery || normalizedQuery === ".") {
    return "";
  }

  const directExtension = normalizedQuery.match(/^\.([a-z0-9#+]+)$/);
  if (directExtension) {
    return directExtension[1];
  }

  const pathExtension = normalizedQuery.match(/\.([a-z0-9#+]+)$/);
  if (pathExtension) {
    return pathExtension[1];
  }

  return "";
};

export const searchLanguages = (query) => {
  const normalizedQuery = normalize(query);
  const extensionToken = extractExtensionToken(normalizedQuery);

  if (!normalizedQuery || normalizedQuery === ".") {
    return LANGUAGE_OPTIONS;
  }

  const textMatches = LANGUAGE_OPTIONS.filter((language) =>
    language.searchableText.includes(normalizedQuery),
  );

  if (!extensionToken) {
    return textMatches;
  }

  const extensionMatches = LANGUAGE_OPTIONS.filter(
    (language) => normalize(language.extension) === extensionToken,
  );

  if (!extensionMatches.length) {
    return textMatches;
  }

  const extensionIds = new Set(extensionMatches.map((language) => language.id));
  const remainingMatches = textMatches.filter(
    (language) => !extensionIds.has(language.id),
  );

  return [...extensionMatches, ...remainingMatches];
};

export const searchLanguageGroups = (query) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery || normalizedQuery === ".") {
    return LANGUAGE_GROUPS;
  }

  const languageMatches = searchLanguages(query);
  const seenGroupKeys = new Set();
  const groupedMatches = [];

  languageMatches.forEach((languageOption) => {
    const group = LANGUAGE_GROUP_BY_ID.get(languageOption.id);
    if (!group || seenGroupKeys.has(group.key)) {
      return;
    }

    seenGroupKeys.add(group.key);
    groupedMatches.push(group);
  });

  return groupedMatches;
};
