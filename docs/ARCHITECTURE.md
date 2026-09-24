# ASAPTools — Architecture

## Purpose

This document describes the technical architecture of ASAPTools.

The architecture should evolve gradually as the product grows.

Do not introduce infrastructure before the product actually needs it.

---

## Current Stack

ASAPTools currently uses:

- Next.js
- React
- TypeScript
- Tailwind CSS
- App Router
- ESLint
- GitHub
- Vercel

Current deployment:

GitHub → Vercel → asaptools.in

---

## Architecture Principles

1. Keep the architecture simple while the product is small.
2. Prefer managed services over maintaining servers manually.
3. Separate frontend concerns from heavy processing.
4. Keep tool-specific logic isolated.
5. Design for scalability without prematurely implementing it.
6. Protect user data and uploaded files.
7. Minimize unnecessary infrastructure costs.
8. Avoid vendor lock-in where practical.
9. Never expose secrets to the browser.
10. Do not introduce a database until a real feature requires persistent data.

---

## Current Application Structure

The Next.js App Router is the primary application structure.

Conceptually:

```text
Browser
   │
   ▼
Next.js Application
   │
   ├── Pages / Routes
   ├── UI Components
   ├── Tool Interfaces
   └── Server-side Logic