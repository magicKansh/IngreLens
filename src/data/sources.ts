import type { Source } from './types'

export const wiki = (title: string, label = title): Source => ({
  org: 'Wikipedia',
  label: `${label} (overview)`,
  url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
})

export const pubchem = (compound: string): Source => ({
  org: 'PubChem (NIH)',
  label: `${compound} compound record`,
  url: `https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(compound)}`,
})

/** A PubMed search link: always resolves, and lets the reader inspect the primary literature themselves. */
export const pubmed = (query: string, label: string): Source => ({
  org: 'PubMed',
  label,
  url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`,
})

export const ods = (slug: string, label: string): Source => ({
  org: 'NIH Office of Dietary Supplements',
  label: `${label} fact sheet`,
  url: `https://ods.od.nih.gov/factsheets/${slug}-HealthProfessional/`,
})

export const S = {
  fdaAdditiveList: {
    org: 'U.S. FDA',
    label: 'Food Additive Status List',
    url: 'https://www.fda.gov/food/food-additives-petitions/food-additive-status-list',
  },
  fdaGras: {
    org: 'U.S. FDA',
    label: 'Generally Recognized as Safe (GRAS)',
    url: 'https://www.fda.gov/food/food-ingredients-packaging/generally-recognized-safe-gras',
  },
  fdaColors: {
    org: 'U.S. FDA',
    label: 'Color Additives',
    url: 'https://www.fda.gov/industry/color-additives',
  },
  fdaSweeteners: {
    org: 'U.S. FDA',
    label: 'Aspartame and Other Sweeteners in Food',
    url: 'https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food',
  },
  fdaAddedSugars: {
    org: 'U.S. FDA',
    label: 'Added Sugars on the Nutrition Facts Label',
    url: 'https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label',
  },
  fdaHfcs: {
    org: 'U.S. FDA',
    label: 'High Fructose Corn Syrup Questions and Answers',
    url: 'https://www.fda.gov/food/food-additives-petitions/high-fructose-corn-syrup-questions-and-answers',
  },
  fdaMsg: {
    org: 'U.S. FDA',
    label: 'Questions and Answers on Monosodium Glutamate (MSG)',
    url: 'https://www.fda.gov/food/food-additives-petitions/questions-and-answers-monosodium-glutamate-msg',
  },
  fdaSodium: {
    org: 'U.S. FDA',
    label: 'Sodium in Your Diet',
    url: 'https://www.fda.gov/food/nutrition-education-resources-materials/sodium-your-diet',
  },
  fdaTransFat: {
    org: 'U.S. FDA',
    label: 'Trans Fat',
    url: 'https://www.fda.gov/food/food-additives-petitions/trans-fat',
  },
  fdaCaffeine: {
    org: 'U.S. FDA',
    label: 'Spilling the Beans: How Much Caffeine is Too Much?',
    url: 'https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much',
  },
  fdaAllergens: {
    org: 'U.S. FDA',
    label: 'Food Allergies',
    url: 'https://www.fda.gov/food/food-labeling-nutrition/food-allergies',
  },
  fdaBvo: {
    org: 'U.S. FDA',
    label: 'Brominated Vegetable Oil (BVO)',
    url: 'https://www.fda.gov/food/food-additives-petitions/brominated-vegetable-oil-bvo',
  },
  fdaXylitolDogs: {
    org: 'U.S. FDA',
    label: 'Paws Off Xylitol; It’s Dangerous for Dogs',
    url: 'https://www.fda.gov/consumers/consumer-updates/paws-xylitol-its-dangerous-dogs',
  },
  cfrFlavors: {
    org: 'U.S. eCFR',
    label: '21 CFR 101.22 – Labeling of flavorings',
    url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-B/section-101.22',
  },
  efsaAdditives: {
    org: 'EFSA',
    label: 'Food additives (topic overview)',
    url: 'https://www.efsa.europa.eu/en/topics/topic/food-additives',
  },
  efsaSweeteners: {
    org: 'EFSA',
    label: 'Sweeteners (topic overview)',
    url: 'https://www.efsa.europa.eu/en/topics/topic/sweeteners',
  },
  efsaTio2: {
    org: 'EFSA',
    label: 'Titanium dioxide: E171 no longer considered safe (2021)',
    url: 'https://www.efsa.europa.eu/en/news/titanium-dioxide-e171-no-longer-considered-safe-when-used-food-additive',
  },
  whoSugars: {
    org: 'WHO',
    label: 'Guideline: Sugars intake for adults and children',
    url: 'https://www.who.int/publications/i/item/9789241549028',
  },
  whoSalt: {
    org: 'WHO',
    label: 'Sodium reduction fact sheet',
    url: 'https://www.who.int/news-room/fact-sheets/detail/salt-reduction',
  },
  whoAspartame: {
    org: 'WHO / IARC / JECFA',
    label: 'Aspartame hazard and risk assessment results (2023)',
    url: 'https://www.who.int/news/item/14-07-2023-aspartame-hazard-and-risk-assessment-results-released',
  },
  whoNss: {
    org: 'WHO',
    label: 'Guideline on non-sugar sweeteners (2023)',
    url: 'https://www.who.int/news/item/15-05-2023-who-advises-not-to-use-non-sugar-sweeteners-for-weight-control-in-newly-released-guideline',
  },
  whoProcessedMeat: {
    org: 'WHO / IARC',
    label: 'Cancer: carcinogenicity of red and processed meat (Q&A)',
    url: 'https://www.who.int/news-room/questions-and-answers/item/cancer-carcinogenicity-of-the-consumption-of-red-meat-and-processed-meat',
  },
  southampton: pubmed(
    'McCann 2007 food additives hyperactive behaviour Lancet',
    'McCann et al. 2007, Lancet – food colours, sodium benzoate and hyperactivity',
  ),
  emulsifierMice: pubmed(
    'Chassaing 2015 dietary emulsifiers gut microbiota colitis metabolic syndrome',
    'Chassaing et al. 2015, Nature – emulsifiers and gut microbiota (mice)',
  ),
  emulsifierHumans: pubmed(
    'Chassaing 2022 carboxymethylcellulose randomized controlled feeding study',
    'Chassaing et al. 2022, Gastroenterology – CMC feeding trial (humans)',
  ),
  emulsifierCohort: pubmed(
    'Sellem 2023 food additive emulsifiers cardiovascular disease NutriNet-Santé BMJ',
    'Sellem et al. 2023, BMJ – emulsifier intake and cardiovascular disease (cohort)',
  ),
} satisfies Record<string, Source>
