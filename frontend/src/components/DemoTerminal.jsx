import { useEffect, useState } from "react";
import { LuArrowRight } from "react-icons/lu";

const DEMOS = [
  {
    label: "Python",
    file: "fib.py",
    langId: 71,
    code: `def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print(fib(10))`,
    output: "55",
    time: "42ms",
  },
  {
    label: "JavaScript",
    file: "hello.js",
    langId: 63,
    code: `const langs = ["C", "Go", "Rust"];

for (const l of langs) {
  console.log(\`hello, \${l}\`);
}`,
    output: "hello, C\nhello, Go\nhello, Rust",
    time: "58ms",
  },
  {
    label: "Rust",
    file: "main.rs",
    langId: 73,
    code: `fn main() {
    let sum: u32 = (1..=10).sum();
    println!("sum = {}", sum);
}`,
    output: "sum = 55",
    time: "312ms",
  },
  {
    label: "Go",
    file: "main.go",
    langId: 60,
    code: `package main

import "fmt"

func main() {
    for i := 1; i <= 3; i++ {
        fmt.Println(i * i)
    }
}`,
    output: "1\n4\n9",
    time: "184ms",
  },
];

const KEYWORDS = new Set([
  "def", "for", "in", "return", "const", "let", "fn", "func", "package",
  "import", "main", "if", "else", "while", "true", "false", "None", "u32",
]);

const TOKEN_PATTERN =
  /(\/\/.*|#.*)|("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(\d+)\b|\b([A-Za-z_]\w*)(?=\()|\b([A-Za-z_]\w*)\b/g;

// Tiny highlighter, just enough for the demo snippets.
function highlight(line) {
  const parts = [];
  let last = 0;

  for (const match of line.matchAll(TOKEN_PATTERN)) {
    if (match.index > last) {
      parts.push(line.slice(last, match.index));
    }

    const [text, comment, string, number, call, word] = match;
    let className = "";
    if (comment) className = "text-syn-com italic";
    else if (string) className = "text-syn-str";
    else if (number) className = "text-syn-num";
    else if (call) className = KEYWORDS.has(call) ? "text-syn-kw" : "text-syn-fn";
    else if (word && KEYWORDS.has(word)) className = "text-syn-kw";

    parts.push(
      className ? (
        <span key={match.index} className={className}>
          {text}
        </span>
      ) : (
        text
      ),
    );
    last = match.index + text.length;
  }

  if (last < line.length) {
    parts.push(line.slice(last));
  }

  return parts;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function DemoTerminal({ onOpen }) {
  const [reduced] = useState(prefersReducedMotion);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(() => (reduced ? DEMOS[0].code.length : 0));
  const [phase, setPhase] = useState(reduced ? "done" : "typing");

  const demo = DEMOS[index];
  const visibleCode = demo.code.slice(0, typed);

  useEffect(() => {
    if (reduced) {
      return;
    }

    let timer;
    if (phase === "typing") {
      timer =
        typed < demo.code.length
          ? setTimeout(
              () => setTyped(typed + 1),
              demo.code[typed] === "\n" ? 110 : 24,
            )
          : setTimeout(() => setPhase("running"), 350);
    } else if (phase === "running") {
      timer = setTimeout(() => setPhase("done"), 650);
    } else {
      timer = setTimeout(() => {
        setIndex((index + 1) % DEMOS.length);
        setTyped(0);
        setPhase("typing");
      }, 3400);
    }

    return () => clearTimeout(timer);
  }, [reduced, phase, typed, index, demo.code]);

  const selectDemo = (nextIndex) => {
    setIndex(nextIndex);
    setTyped(reduced ? DEMOS[nextIndex].code.length : 0);
    setPhase(reduced ? "done" : "typing");
  };

  return (
    <div className="rounded-xl border border-line-strong bg-surface overflow-hidden shadow-[0_30px_80px_-30px_color-mix(in_srgb,var(--accent)_22%,transparent)]">
      <div className="flex items-center justify-between border-b border-line bg-raised/60 pr-2">
        <div className="flex" role="tablist" aria-label="Example languages">
          {DEMOS.map((item, itemIndex) => (
            <button
              key={item.label}
              role="tab"
              aria-selected={itemIndex === index}
              onClick={() => selectDemo(itemIndex)}
              className={`relative h-10 px-3.5 font-mono text-xs transition-colors ${
                itemIndex === index
                  ? "text-ink bg-surface"
                  : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {item.file}
              {itemIndex === index && (
                <span className="absolute inset-x-0 top-0 h-px bg-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 min-h-[250px] font-mono text-[13px] leading-6">
        <div className="whitespace-pre-wrap text-ink" aria-label={`${demo.label} example`}>
          {visibleCode.split("\n").map((line, lineIndex, lines) => (
            <div key={lineIndex} className="flex">
              <span className="w-6 shrink-0 select-none text-ink-3 text-right mr-4">
                {lineIndex + 1}
              </span>
              <span>
                {highlight(line)}
                {phase === "typing" && lineIndex === lines.length - 1 && (
                  <span className="caret" />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line bg-bg/60 px-5 py-3 font-mono text-[13px] min-h-[104px]">
        {phase === "typing" && (
          <p className="text-ink-3">
            <span className="text-accent">$</span> waiting for code…
          </p>
        )}
        {phase === "running" && (
          <p className="text-warn">
            <span className="text-accent">$</span> running {demo.file}…
          </p>
        )}
        {phase === "done" && (
          <>
            <pre className="text-ink leading-6 whitespace-pre-wrap">{demo.output}</pre>
            <p className="mt-1.5 text-xs text-ink-3">
              <span className="text-ok">●</span> finished in {demo.time}
            </p>
          </>
        )}
      </div>

      <button
        onClick={() => onOpen(demo.langId)}
        className="group w-full flex items-center justify-between px-5 h-11 border-t border-line text-sm text-ink-2 hover:text-accent transition-colors"
      >
        <span>Open {demo.label} in the editor</span>
        <LuArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}
