## Money Manager – Monorepo Layout

```
Money_manager/
├─ frontend/   # React + Vite + Tailwind app
└─ backend/    # Node/Express API stub (modular-ready)
```

### Frontend
- Stack: React 19 + Vite + TailwindCSS.
- Env: create `frontend/.env.local` with `VITE_API_URL=http://localhost:4000/api`.
- Scripts (run inside `frontend`):
  - `npm run dev -- --host` – dev server
  - `npm run build` – production build
  - `npm run preview -- --host` – preview built assets

### Backend
- Stack: Node + Express with CORS and JSON body parsing.
- Entry: `backend/src/server.js` with in-memory accounts/transactions and routes:
  - GET `/api/accounts`
  - GET `/api/transactions`
  - POST `/api/transactions`
  - PATCH `/api/transactions/:id`
- Scripts (run inside `backend`):
  - `npm install`
  - `npm run dev` (nodemon) or `npm start`
- Env: optional `.env` for `PORT` (defaults to 4000).

### Wiring
- Frontend API client uses `VITE_API_URL`; if unreachable, it falls back to local data and shows an “Offline mode” badge.
- To run full-stack locally:
  1) `cd backend && npm install && npm run dev`
  2) `cd frontend && npm install && npm run dev -- --host`
  3) Open the frontend; it will call `http://localhost:4000/api`.

### Notes
- UI includes demo reset for quick review.
- Tailwind v3 with PostCSS is configured inside `frontend/`.
