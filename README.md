# Woodspeaks

Website for Woodspeaks Limited — personalised keepsakes and gifts, Lagos.

## Run it locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The intro plays once per browser session; open a new private window to see it again.

## Before committing

```bash
npm run lint
npx tsc --noEmit
npm run build
```

See `docs/GUIDE.md` for conventions, brand rules, security rules and the list of placeholders waiting on the client.
