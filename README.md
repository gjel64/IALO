# Editor

Éditeur de contenus H5P (React + Vite).

## Lancer avec Docker

```sh
docker compose up -d --build
```

→ http://localhost:5173

Arrêter : `docker compose down`

## Lancer en dev (hors Docker)

```sh
npm install
npm run dev
```

→ http://localhost:5173 (hot-reload)

> Les deux utilisent le port 5173 : n'en lance qu'un à la fois.

## Fichiers d'exemple

```sh
node samples/make.mjs
```

Génère des `.h5p` de test dans `samples/`.
