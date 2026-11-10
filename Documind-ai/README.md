# DocuMind AI — Workspace prototype

A responsive React + Vite workspace prototype for researchers and students working with complex documents. The interface follows the Neo-Brutalist Pastel Harmony design system described in [DESIGN.md](DESIGN.md).

## Start locally

```bash
npm install
npm run dev
```

## Available scripts

- `npm run dev` — start the Vite development server
- `npm run build` — create the production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

## Working in the prototype

- Choose or drag in PDF, DOC, DOCX, and TXT files up to 25 MB each. Selected files are shown in page memory only; they are not sent to a server or saved between refreshes.
- Search documents by filename, filter by file type, sort by recent or filename, and switch between list and grid views.
- Switch between light and dark appearances.
- The sample documents are clearly marked. AI analysis, cloud upload, document processing, chat, and comparison are planned capabilities and are not connected.

## Stack

React, Vite, Tailwind CSS v4, Lucide React, React Router, Zustand, TanStack Query, and Motion.
