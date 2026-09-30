# Editor

Éditeur de contenus H5P, avec génération d'activités par IA.

- `frontend/` : éditeur React + Vite, servi par nginx
- `backend/` : API FastAPI, seule à parler à la gateway EVA (LLM)

## Configuration (une fois)

```sh
cp .env.example .env   # puis renseigner EVA_BASE_URL et EVA_API_KEY
```

`.env` est ignoré par git et Docker, et interdit en lecture à Claude Code (`.claude/settings.json`).
La clé est transmise au seul conteneur `backend` sous forme de secret Docker : absente de `docker inspect`, des logs et du navigateur.

## Lancer avec Docker

```sh
docker compose up -d --build
```

→ http://localhost:5173

Arrêter : `docker compose down`

## Lancer en dev (hors Docker)

```sh
docker compose up -d --build backend   # l'API reste dans Docker
cd frontend
npm install
npm run dev
```

→ http://localhost:5173 (hot-reload, `/api` redirigé vers le conteneur)

> Docker et `npm run dev` utilisent tous deux le port 5173 : lancez le service `frontend` ou `npm run dev`, pas les deux.

## Fichiers d'exemple

```sh
node frontend/samples/make.mjs
```

Génère des `.h5p` de test dans `frontend/samples/`.
