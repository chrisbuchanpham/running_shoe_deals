# Canadian Running + Trail Deals Tracker

Clean-room, static replacement for a Canadian running-shoe deal aggregator.  
Built with `Vite + React + TypeScript` and designed for GitHub Pages deployment.

## Features

- Daily snapshot-based deal index from 12 Canadian retailers
- Canonical data contracts with runtime validation (`zod`)
- Hybrid matching: exact SKU/GTIN + normalized model fallback with confidence scoring
- Search/filter UI for brand, category, gender, retailer, and price range
- Shoe detail comparison view with cross-retailer price table
- Compliance pages: Terms, Privacy, Data Source Disclaimer
- Scheduled ingestion + validation workflow (`0 12 * * *`)

## Project Structure

- `src/` frontend app and shared contracts
- `scripts/` ingestion, parser framework, and validation
- `scripts/fixtures/` fallback fixture data for each retailer parser
- `data/manual_overrides.json` curator overrides and patch rules
- `scripts/config/disabled-parsers.json` parser-level kill switch list
- `public/data/*.json` generated and committed snapshot artifacts
- `.github/workflows/` deploy and scheduled refresh workflows

## Local Commands

```bash
npm ci
npm run dev
npm run test
npm run ingest
npm run validate:data
npm run build
```

## GitHub Pages Deployment

1. Create a GitHub repository (for example, `running_shoe_deals`).
2. Push this project to `main`.
3. In repository settings, set Pages source to **GitHub Actions**.
4. Ensure Actions are enabled.
5. `deploy.yml` publishes the site on push to `main`.
6. Primary entry URL after deploy:
   - `https://<username>.github.io/running_shoe_deals/`
7. For project Pages repositories, root (`https://<username>.github.io/`) may return `404`.
8. Build includes a post-build alias step (`scripts/build-subpath.mjs`) that mirrors
   `dist/index.html` to `dist/running_shoe_deals/index.html`.

## Data Refresh Workflow

- `refresh-data.yml` runs daily at `12:00 UTC`.
- It executes ingestion + validation.
- It commits only `public/data/*` when changes are detected.
- Any commit to `main` triggers the deploy workflow.

## Notes

- v1 uses direct retailer links (no affiliate wrappers).
- Prices are CAD snapshots only (tax/shipping not normalized).
- Parsers include fixture fallback to keep the pipeline stable when selectors drift.
