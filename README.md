# WorkThread v2.4 — Tira del hilo y encuentra trabajo! (Neon Theme)

## Arranque local
```bash
cd backend
npm i
npx prisma generate
npx prisma db push
npm run prisma:seed   # opcional
npm run dev
```
Frontend se sirve en `http://localhost:4000`.

## Despliegue recomendado (gratis)
- Backend: Render.com (root: `backend`, start: `node src/server.js`).
- Frontend: Cloudflare Pages (root: `frontend`). Si están en dominios distintos, en `frontend/assets/app.js` cambia `API` a tu dominio backend.
