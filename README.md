# CodeRun

CodeRun is a full-stack, browser-based code runner built with React + Vite on the frontend and Express on the backend. It uses Judge0 to compile and execute code in many programming languages from a Monaco-powered editor.

## Highlights

- Run code in 40+ languages through Judge0
- Monaco editor with language-aware starter templates
- Quick language search by name, id, or extension
- Per-language autosave and previous-code restore using localStorage
- Built-in stdin panel with input-aware run guard
- Copy, clear, reset, export, and output-copy actions
- Light and dark theme toggle
- Execution status, runtime feedback, and toast notifications

## Tech Stack

- Frontend: React 19, Vite 8, Tailwind CSS 4, Monaco Editor
- Backend: Node.js, Express 5, Axios, CORS, dotenv
- Execution engine: Judge0 API

## Project Structure

```text
CodeRun/
  backend/
    index.js
    package.json
  frontend/
    src/
    package.json
  .gitignore
```

## Prerequisites

- Node.js 18+
- pnpm 10+ (recommended, lockfile is pnpm)

## Getting Started

Run frontend and backend in separate terminals.

### 1. Start backend

```bash
cd backend
pnpm install
pnpm dev
```

Backend runs on `http://localhost:5000` by default.

### 2. Start frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend runs on `http://localhost:5173` by default.

## Environment Variables

Environment files are ignored by git. Defaults are already provided in code, so `.env` files are optional.

### Backend (`backend/.env`)

| Variable            | Required | Default                 | Description                                      |
| ------------------- | -------- | ----------------------- | ------------------------------------------------ |
| `PORT`              | No       | `5000`                  | Backend port                                     |
| `JUDGE0_BASE_URL`   | No       | `https://ce.judge0.com` | Judge0 base URL                                  |
| `JUDGE0_AUTH_TOKEN` | No       | -                       | Bearer token if your Judge0 provider requires it |
| `JUDGE0_API_KEY`    | No       | -                       | API key (for providers like RapidAPI)            |
| `JUDGE0_API_HOST`   | No       | -                       | API host header (for providers like RapidAPI)    |

### Frontend (`frontend/.env`)

| Variable            | Required | Default                 | Description              |
| ------------------- | -------- | ----------------------- | ------------------------ |
| `VITE_API_BASE_URL` | No       | `http://localhost:5000` | Base URL for backend API |

## Scripts

### Backend (`backend/package.json`)

- `pnpm dev`: Start backend with watch mode
- `pnpm start`: Start backend normally

### Frontend (`frontend/package.json`)

- `pnpm dev`: Start Vite dev server
- `pnpm build`: Create production build
- `pnpm preview`: Preview production build locally
- `pnpm lint`: Run ESLint

## API Endpoints

### `GET /api/health`

Health check endpoint.

Response example:

```json
{
  "ok": true
}
```

### `POST /api/execute`

Execute code for a selected language.

Request body:

```json
{
  "languageId": 71,
  "sourceCode": "print('Hello, World!')",
  "stdin": ""
}
```

Successful response (shape):

```json
{
  "status": { "id": 3, "description": "Accepted" },
  "output": "Hello, World!\n",
  "stdout": "Hello, World!\n",
  "stderr": "",
  "compileOutput": "",
  "time": "0.01",
  "memory": 1234
}
```

Error response (shape):

```json
{
  "error": "Failed to execute code.",
  "details": {}
}
```

## Editor Shortcuts

- `Ctrl/Cmd + Enter`: Run code
- `Ctrl/Cmd + Shift + K`: Clear editor
- `Ctrl/Cmd + Shift + C`: Copy code
- `Ctrl/Cmd + Z`: Undo last clear action (when available)

## Notes

- Language options are based on Judge0 language IDs.
- Backend includes a fallback retry strategy for certain transient Judge0 internal errors.
- If your provider enforces auth headers, set the Judge0 auth variables in backend `.env`.
