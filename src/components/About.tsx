import { INGREDIENTS } from '../data/ingredients'

export function About() {
  return (
    <div className="about">
      <div className="page-head">
        <h2>How IngreLens works</h2>
        <p className="muted">Built to be useful and honest about what it does and doesn’t know.</p>
      </div>
      <div className="about-grid">
        <section className="card">
          <h3>1 · Reading the label</h3>
          <p>
            Text recognition uses <a href="https://github.com/naptha/tesseract.js" target="_blank" rel="noopener noreferrer">Tesseract.js</a>, an open-source OCR
            engine that runs entirely in your browser. Your photo is never uploaded. We enhance contrast first, then find the “Ingredients” section,
            split it into items (including sub-ingredients in parentheses) and pull out “Contains” and “May contain” statements.
          </p>
        </section>
        <section className="card">
          <h3>2 · Matching ingredients</h3>
          <p>
            Each item is matched against {INGREDIENTS.length} curated entries by name, alias and E-number. Items that look like OCR typos are shown
            as <em>possible matches</em> for you to confirm. Anything else is marked <em>unknown</em> — we show a clearly labelled Wikipedia summary
            and research links instead of inventing an explanation.
          </p>
        </section>
        <section className="card">
          <h3>3 · Evidence levels</h3>
          <ul className="plain">
            <li><strong>Strong</strong> — consistent findings from large trials, systematic reviews or long regulatory history.</li>
            <li><strong>Moderate</strong> — reasonably consistent evidence with some gaps.</li>
            <li><strong>Limited</strong> — few human studies; mostly animal, lab or small studies.</li>
            <li><strong>Mixed / debated</strong> — credible bodies or studies disagree.</li>
          </ul>
        </section>
        <section className="card">
          <h3>4 · Attention levels</h3>
          <p>
            “Attention” is a reading aid summarising the cited evidence and regulatory actions (for example an EU ban, an FDA revocation or a
            strong link to disease at typical intakes). It is <strong>not</strong> a safety rating: dose, frequency and your own health matter more
            than the presence of a single ingredient.
          </p>
        </section>
        <section className="card">
          <h3>Sources</h3>
          <p>
            Entries are based on publicly available material from the U.S. FDA and eCFR, the European Food Safety Authority (EFSA), the World Health
            Organization and IARC, the NIH Office of Dietary Supplements, PubChem and peer-reviewed studies (linked through PubMed). Wikipedia
            links are provided as readable overviews. Barcode lookups use <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a>.
          </p>
        </section>
        <section className="card warn">
          <h3>Limitations</h3>
          <ul className="plain">
            <li>OCR makes mistakes, especially on curved, glossy or small print. Always check the recognised text.</li>
            <li>Regulations change and differ by country. Verify current rules with your local authority.</li>
            <li>This is general information, not medical or dietary advice. If you have allergies or a health condition, rely on the physical label and a qualified professional.</li>
            <li>Saved products are stored only in this browser. Clearing site data removes them.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
