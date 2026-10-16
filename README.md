# IngreLens

Scan a food or drink ingredient label and get a plain-language explanation of every ingredient: what it does, potential benefits, possible downsides, how strong the evidence is, regulatory status and links to the sources.

**Use it online:** https://magickansh.github.io/IngreLens/

The site redeploys automatically on every push to `main` (see `.github/workflows/deploy.yml`).

## Features

- **Photo OCR in the browser.** [Tesseract.js](https://github.com/naptha/tesseract.js) runs locally, so photos are never uploaded. Add a photo by upload, drag and drop, phone camera or clipboard paste.
- **Smart parsing.** Finds the "Ingredients" section and handles sub-ingredients in parentheses, "contains 2% or less of", percentages, and "Contains" / "May contain" statements.
- **Editable list.** Fix OCR mistakes, add or remove items, or re-extract from corrected text.
- **Curated, sourced database.** About 140 entries covering hundreds of label names and E-numbers, citing FDA, eCFR, EFSA, WHO/IARC, NIH ODS, PubChem and peer-reviewed studies.
- **Honest about uncertainty.** Likely OCR typos are shown as *possible matches* for you to confirm. Unknown ingredients get a clearly labelled Wikipedia summary and research links, never an invented explanation.
- **Barcode lookup** through the free Open Food Facts API.
- **Compare products** side by side: flagged items, allergens, sweeteners, colours, and shared or unique ingredients.
- **Ingredient library** you can search by name, alias or E-number.
- No account, no API keys, and no backend. Saved products stay in your browser's localStorage.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Other scripts: `npm test` (parser and matcher tests), `npm run build`, `npm run preview`.

The first OCR run downloads about 10 MB of English language data from a CDN, so it needs an internet connection. Wikipedia and Open Food Facts lookups also need one.

## Disclaimer

IngreLens provides general information, not medical advice. "Attention" levels are a reading aid, not safety ratings. Always check the physical label for allergens.
