# CLAUDE.md

## Build

Source files live in `src/`. The build script compiles everything into `public/`:

```
python scripts/build_platform.py
```

Run this after every change. Preview the result at http://localhost:3000 with:

```
python -m http.server 3000 --directory public
```

## NEVER edit files in `public/`

Files in `public/` are generated and will be overwritten on the next build. All edits must go to the source files below.

## Source files

| File | Purpose |
|------|---------|
| `src/js/app.js` | CloseIQ logic |
| `src/css/app.css` | Styles |
| `src/data/closeiq_data.json` | Close data |
| `src/html/closeiq_body.html` | CloseIQ layout |
| `src/apps/evolution.html` | Vision app |
| `src/apps/command-center.html` | Command Center app |
| `src/apps/shell.html` | Shell / app-switcher |
