require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

const PORT = Number(process.env.PORT || 5000);
const JUDGE0_BASE_URL = (
  process.env.JUDGE0_BASE_URL || "https://ce.judge0.com"
).replace(/\/$/, "");

const LEGACY_LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
  rust: 73,
  go: 60,
};

const SUPPORTED_LANGUAGE_IDS = new Set([
  45, 46, 47, 75, 76, 48, 52, 49, 53, 50, 54, 86, 51, 77, 55, 56, 57, 58, 44,
  87, 59, 60, 88, 61, 62, 63, 78, 64, 89, 79, 65, 66, 67, 85, 68, 43, 69, 70,
  71, 80, 72, 73, 81, 82, 83, 74, 84,
]);
const INTERNAL_ERROR_STATUS_ID = 13;

const resolveLanguageId = ({ language, languageId }) => {
  if (Number.isInteger(languageId)) {
    return languageId;
  }

  if (typeof languageId === "string" && languageId.trim()) {
    const parsedLanguageId = Number(languageId);
    if (Number.isInteger(parsedLanguageId)) {
      return parsedLanguageId;
    }
  }

  if (typeof language === "string") {
    const normalizedLanguage = language.trim().toLowerCase();
    if (
      Object.prototype.hasOwnProperty.call(
        LEGACY_LANGUAGE_IDS,
        normalizedLanguage,
      )
    ) {
      return LEGACY_LANGUAGE_IDS[normalizedLanguage];
    }

    const parsedLanguageId = Number(normalizedLanguage);
    if (Number.isInteger(parsedLanguageId)) {
      return parsedLanguageId;
    }
  }

  return null;
};

const encodeBase64 = (value) =>
  Buffer.from(String(value ?? ""), "utf8").toString("base64");

const decodeBase64 = (value) => {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }

  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return value;
  }
};

const encodeJudge0Value = (value, useBase64) => {
  const normalizedValue = String(value ?? "");
  return useBase64 ? encodeBase64(normalizedValue) : normalizedValue;
};

const decodeJudge0Value = (value, isBase64) => {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }

  return isBase64 ? decodeBase64(value) : value;
};

const normalizeJudge0Result = (result, isBase64) => {
  const stdout = decodeJudge0Value(result.stdout, isBase64);
  const stderr = decodeJudge0Value(result.stderr, isBase64);
  const compileOutput = decodeJudge0Value(result.compile_output, isBase64);
  const message = decodeJudge0Value(result.message, isBase64);
  const output =
    [stdout, stderr, compileOutput, message].find(
      (value) => typeof value === "string" && value.length > 0,
    ) || "";

  return {
    status: result.status || null,
    output,
    stdout,
    stderr,
    compileOutput,
    message,
    time: result.time || null,
    memory: result.memory || null,
  };
};

const isInternalJudge0Error = (normalizedResult) => {
  if (!normalizedResult?.status) {
    return false;
  }

  if (normalizedResult.status.id === INTERNAL_ERROR_STATUS_ID) {
    return true;
  }

  return String(normalizedResult.status.description || "")
    .toLowerCase()
    .includes("internal error");
};

const toFriendlyInternalError = (normalizedResult) => {
  const rawOutput = String(normalizedResult.output || "");
  if (rawOutput.includes("/box/Main.java")) {
    return {
      ...normalizedResult,
      output:
        "Temporary runner issue while preparing Java files. Click Run again.",
    };
  }

  return {
    ...normalizedResult,
    output: "Temporary runner issue. Please click Run again.",
  };
};

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/execute", async (req, res) => {
  const { language, languageId, sourceCode, stdin = "" } = req.body || {};
  const resolvedLanguageId = resolveLanguageId({ language, languageId });

  if (!resolvedLanguageId || !SUPPORTED_LANGUAGE_IDS.has(resolvedLanguageId)) {
    return res.status(400).json({
      error: "Unsupported language.",
      supportedLanguages: Array.from(SUPPORTED_LANGUAGE_IDS),
    });
  }

  if (typeof sourceCode !== "string" || !sourceCode.trim()) {
    return res.status(400).json({
      error: "sourceCode is required.",
    });
  }

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (process.env.JUDGE0_AUTH_TOKEN) {
      headers.Authorization = `Bearer ${process.env.JUDGE0_AUTH_TOKEN}`;
    }

    if (process.env.JUDGE0_API_KEY) {
      headers["X-RapidAPI-Key"] = process.env.JUDGE0_API_KEY;
    }

    if (process.env.JUDGE0_API_HOST) {
      headers["X-RapidAPI-Host"] = process.env.JUDGE0_API_HOST;
    }

    const submitToJudge0 = async (useBase64) => {
      const judge0Response = await axios.post(
        `${JUDGE0_BASE_URL}/submissions?base64_encoded=${useBase64 ? "true" : "false"}&wait=true`,
        {
          language_id: resolvedLanguageId,
          source_code: encodeJudge0Value(sourceCode, useBase64),
          stdin: encodeJudge0Value(stdin, useBase64),
        },
        { headers },
      );

      return normalizeJudge0Result(judge0Response.data || {}, useBase64);
    };

    let finalResult = await submitToJudge0(true);
    if (isInternalJudge0Error(finalResult)) {
      const fallbackResult = await submitToJudge0(false);
      finalResult = isInternalJudge0Error(fallbackResult)
        ? toFriendlyInternalError(fallbackResult)
        : fallbackResult;
    }

    return res.json({
      status: finalResult.status,
      output: finalResult.output,
      stdout: finalResult.stdout,
      stderr: finalResult.stderr,
      compileOutput: finalResult.compileOutput,
      time: finalResult.time,
      memory: finalResult.memory,
    });
  } catch (error) {
    const statusCode = error?.response?.status || 500;
    const data = error?.response?.data;

    return res.status(statusCode).json({
      error: data?.error || data?.message || "Failed to execute code.",
      details: data || null,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
