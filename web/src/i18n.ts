/**
 * English / French interface text. Every key in `en` must exist in `fr`
 * (checked by the type below). Placeholders look like {name}.
 */

export type Lang = "en" | "fr";
export const LANGS: Lang[] = ["en", "fr"];
const STORAGE_KEY = "borderless-lang";

const en = {
  // page
  "page.title": "Borderless — an atlas of visa access",
  "page.description": "Interactive world map of visa access between countries, from 2019 to today.",
  "page.tagline": "an atlas of visa access",
  "page.skip": "Skip to the country panel",
  "page.search": "Choose a passport…",
  "page.searchLabel": "Choose a passport",
  "page.viewsLabel": "Map view",
  "page.map": "World map",
  "page.details": "Details",
  "page.timeline": "Snapshot timeline",
  "page.loadError": "Something went wrong while loading the data. Please reload the page.",
  "lang.switch": "FR, afficher en français",
  "lang.short": "FR",
  "theme.toLight": "Switch to light theme",
  "theme.toDark": "Switch to dark theme",
  "map.attribution": "Boundaries: Natural Earth",

  // views and tabs
  "view.access": "Access",
  "view.reciprocity": "Reciprocity",
  "view.combo": "Two passports",
  "view.community": "Blocs",
  "tab.passport": "Passport",
  "tab.insights": "Insights",
  "tab.wealth": "Wealth",
  "tab.trips": "Trips",
  "tab.changes": "Changes",

  // categories
  "cat.visa_free": "Visa-free",
  "cat.visa_on_arrival": "Visa on arrival",
  "cat.eta": "ETA",
  "cat.e_visa": "e-Visa",
  "cat.visa_required": "Visa required",
  "cat.no_admission": "No admission",
  "cat.home": "Home country",
  "cat.daysUpTo": "up to {days} days",
  "detail.covid_ban": "COVID-19 entry ban",
  "detail.hayya_entry_permit": "Hayya entry permit (World Cup 2022)",
  "detail.uk_electronic_visa_waiver": "UK electronic visa waiver",
  "detail.voa_eta_or_e_visa": "Approximate: before November 2020 the source used one bucket for visa on arrival, ETA and e-visa",
  "common.noData": "No data",
  "common.days": "{n} days",
  "common.daysShort": "{n}d",
  "common.notStated": "not stated",
  "common.choose": "Choose…",

  // app shell
  "app.loading": "Loading the {date} snapshot…",
  "app.loadFailed": "Could not load this snapshot: {error}",
  "app.snapshotLatest": "Data snapshot: {date}.",
  "app.snapshotViewing": "Viewing {date} · latest data: {latest}.",
  "app.disclaimer": "Visa rules change often. Always check the destination's official government source before travelling.",
  "app.sources": "Data: Passport Index dataset (MIT), World Bank, UNDP, Natural Earth",
  "app.unmapped": "Unmapped area",
  "app.unmappedHint": "No data in the visa dataset for this territory.",

  // legend
  "legend.entryFor": "Entry for {name} passport holders",
  "legend.score": "Visa-free score of each passport",
  "legend.fewer": "fewer destinations",
  "legend.more": "more",
  "legend.fairness": "Fairness score: share of symmetric relationships",
  "legend.reciprocityFor": "Reciprocity for {name}",
  "legend.favourableTo": "Favourable to {name}",
  "legend.symmetric": "Symmetric",
  "legend.unfavourableTo": "Unfavourable to {name}",
  "legend.selected": "Selected country",
  "legend.pickTwo": "Pick two passports",
  "legend.blocs": "Visa blocs detected in the {year} network",

  // access view
  "access.tipScore": "Visa-free score {score}",
  "access.tipRank": "{rank} of {of}",
  "access.tipClick": "Click to see where this passport goes",
  "access.tipSelected": "Selected passport",
  "access.tipEsc": "Press Esc to clear",
  "access.tipSchengen": "Schengen: days count across the whole area (90 in any 180)",
  "access.tipFor": "for {name} passport holders",

  // passport tab
  "passport.introTitle": "Where can a passport take you?",
  "passport.intro":
    "Click a country on the map or search for it to see where its citizens can travel, and how. The map is currently shaded by each passport's <strong>visa-free score</strong>: the number of destinations reachable visa-free or with a visa on arrival.",
  "passport.strongest": "Strongest passports · {date}",
  "passport.rank": "Rank",
  "passport.passport": "Passport",
  "passport.score": "Score",
  "passport.scoreLabel": "visa-free score",
  "passport.rankLabel": "world rank of {of}",
  "passport.schengenArea": "Schengen Area",
  "passport.noteSchengen":
    "<strong>Schengen:</strong> a visa-free stay is counted across the whole Schengen Area (usually 90 days in any 180-day period), not per country.",
  "passport.noteMixed":
    "Before November 2020 the source used one bucket for visa on arrival, ETA and e-visa. It is shown as visa on arrival (what most of it became), so scores for this snapshot are approximate.",
  "passport.noteEta": "In this snapshot ETAs are not separated from e-visas; the split starts on 12 January 2025.",
  "passport.noteConditional":
    "Some entries depend on conditions (for example, visa-free with a valid US or Schengen visa, or only at certain airports). One category per country can't show that, so treat each colour as the general rule.",
  "passport.requirements": "Entry requirements",
  "passport.requirementsAria": "Destinations by entry requirement",
  "passport.destinations": "Destinations",

  // reciprocity
  "recip.introTitle": "Who gives what back?",
  "recip.intro":
    "Select a country to see which relationships are symmetric, and where it gives more access than it gets. The map is shaded by each country's fairness score.",
  "recip.title": "Reciprocity",
  "recip.explain":
    "Each relationship compares what {name}'s citizens get abroad with what that country gives back, on four tiers: visa-free or on arrival, ETA, e-visa, visa required.",
  "recip.aCountry": "a country",
  "recip.symmetricShare": "symmetric relationships",
  "recip.fairnessRank": "fairness rank of {of}",
  "recip.givesMore": "Where {name} gives more than it gets ({n})",
  "recip.inReturn": "{out} for {name} · {back} in return",
  "recip.most": "Most reciprocal",
  "recip.least": "Least reciprocal",
  "recip.country": "Country",
  "recip.fair": "Fair",
  "recip.fairTitle": "Share of symmetric relationships",
  "recip.balance": "Balance",
  "recip.balanceTitle": "(favourable − unfavourable) / partners",
  "recip.balanceNote":
    "A negative balance means a country lets in more people visa-free than it gets in return — often small tourism economies that open up unilaterally.",
  "recip.favourable": "Favourable",
  "recip.symmetric": "Symmetric",
  "recip.unfavourable": "Unfavourable",
  "recip.tipFairness": "Fairness score {score}",
  "recip.tipShare": "{symmetric} of {partners} relationships are symmetric",
  "recip.tipPair": "{from} → {to}: {access}",

  // history
  "history.title": "Visa-free score over time",
  "history.median": "World median",
  "history.biggest": "Biggest move between two snapshots: <strong>{delta}</strong> ({from} → {to}).",
  "history.legend":
    "Shaded: COVID-19 entry bans. Dotted lines mark events; blue lines mark ETA milestones. Click the chart to open that snapshot.",
  "history.covid": "COVID-19 bans",
  "history.yLabel": "Visa-free score",
  "chart.overTime": "{y} over time",
  "chart.against": "{y} against {x}",

  // timeline
  "tl.snapshot": "Snapshot",
  "tl.prev": "Previous snapshot",
  "tl.next": "Next snapshot",
  "tl.latest": "Back to latest",
  "tl.range": "Snapshot date",
  "tl.covidBand": "COVID-19 travel bans",
  "tl.gap": "No snapshots between {from} and {to}",
  "tl.covidBans": "{n} COVID-19 entry bans",
  "tl.newSource": "new data maintainer from this snapshot",
  "tl.mixed": "visa on arrival, ETA and e-visa not separated",
  "tl.etaMerged": "ETAs counted as e-visas",
  "tl.noDays": "no day counts",

  // insights
  "insights.title": "Network insights",
  "insights.method":
    "Visa access as a directed graph: an edge from passport to destination, weighted by ease of entry (visa-free {vf}, on arrival {voa}, ETA {eta}, e-visa {ev}, visa required {vr}, no admission: no edge).",
  "insights.rankingLabel": "Ranking",
  "insights.power": "Passport power",
  "insights.powerHelp": "Weighted out-degree: how easily this passport's holders get into every other country (100 = visa-free everywhere).",
  "insights.openness": "Openness",
  "insights.opennessHelp": "Weighted in-degree: how easily every other passport gets in (100 = visa-free for everyone).",
  "insights.centrality": "Centrality",
  "insights.centralityHelp": "PageRank on the access graph (×1000): high when a country is easy to reach from passports that are themselves easy to reach.",
  "insights.fairness": "Fairness",
  "insights.fairnessHelp": "Share of relationships where both sides grant the same tier of access.",
  "insights.computedFor": "Computed for the {date} snapshot.",
  "insights.blocs": "Visa blocs",
  "insights.blocsMethod":
    "Louvain community detection on mutual access (each pair weighted by the weaker direction), split recursively while the split still has a modularity of at least {q}. Labels name the reference blocs a community contains.",
  "insights.showBlocs": "Show blocs on the map",
  "insights.blocsShown": "Blocs are shown on the map",
  "insights.countries": "{n} countries",
  "insights.contains": "Contains {list}.",
  "insights.ofMembers": "{name} ({pct} of members)",
  "insights.note":
    "Communities are a lens, not a treaty map: a country lands in the group it shares the most mutual visa-free access with. Mercosur, for instance, sits inside the wider visa-free club around Schengen because its members are open to Europe as well as to each other.",
  "community.partners": "{blocs} and partners",
  "community.mixed": "Mixed, mostly {region}",
  "community.none": "No community",
  "community.tipContains": "contains {blocs}",

  // combo
  "combo.title": "Two passports",
  "combo.intro":
    "Dual citizens can use whichever passport works best at each border. Pick a first passport on the map or with the search box, then choose the second one here.",
  "combo.first": "First passport: <strong>{name}</strong>. Click another country on the map or choose it below.",
  "combo.second": "Second passport",
  "combo.swap": "Swap the two passports",
  "combo.added": "visa-free destinations added by {name}",
  "combo.combined": "combined visa-free score",
  "combo.improves": "{second} improves access to <strong>{n}</strong> destinations compared with {first} alone, and opens <strong>{free}</strong> of them without an advance application.",
  "combo.onlyGains": "Only colour destinations where {name} does better",
  "combo.best": "Best access with either passport",
  "combo.adds": "What {name} adds",
  "combo.tipBest": "Best with {via}",
  "combo.tipEither": "either passport",
  "combo.tipThe": "the {name} passport",
  "combo.tipOneOfTwo": "One of the two passports",

  // wealth
  "wealth.title": "Openness vs wealth",
  "wealth.introGdp":
    "Each dot is a passport in the {date} snapshot: its visa-free score against GDP per capita (log scale, current US$, World Bank). Click a dot to open that passport on the map.",
  "wealth.introHdi":
    "Each dot is a passport in the {date} snapshot: its visa-free score against the Human Development Index (UNDP). Click a dot to open that passport on the map.",
  "wealth.axisLabel": "Wealth measure",
  "wealth.gdp": "GDP per capita",
  "wealth.hdi": "HDI",
  "wealth.pearson": "Pearson correlation (n = {n})",
  "wealth.variance": "of the variance explained",
  "wealth.strongerGdp": "Stronger passport than income predicts",
  "wealth.strongerHdi": "Stronger passport than development predicts",
  "wealth.weaker": "Weaker than predicted",
  "wealth.describe": "{name}: score {score}, {delta} vs expected",
  "wealth.caveat":
    "Correlation is not causation: wealth, diplomacy, migration pressure and regional agreements all move together. Not plotted (no {source} value): {list}.",
  "wealth.sourceGdp": "World Bank GDP",
  "wealth.sourceHdi": "UNDP HDI",
  "wealth.none": "none",
  "wealth.xGdp": "GDP per capita (log)",
  "wealth.xHdi": "Human Development Index",
  "wealth.tipScore": "Visa-free score {score}",

  // trips
  "trips.title": "Trip planner",
  "trips.intro": "Where can you go without applying for anything in advance? Visa-free and visa-on-arrival destinations, longest allowed stay first.",
  "trips.passport": "Passport",
  "trips.region": "Region",
  "trips.allRegions": "All regions",
  "trips.subregion": "Subregion",
  "trips.allSubregions": "All subregions",
  "trips.world": "the world",
  "trips.count": "<strong>{n}</strong> destination{s} in {where} with no advance application for {name} passport holders{when}.",
  "trips.schengen": "<strong>Schengen:</strong> days spent in any Schengen country count towards one shared limit (90 days in any 180).",
  "trips.destination": "Destination",
  "trips.entry": "Entry",
  "trips.stay": "Stay",
  "trips.nothing": "Nothing in this region without an advance application.",
  "trips.note":
    "\"Not stated\" means the source gives no day count (for example freedom of movement, or rules it couldn't express as a number). Visas on arrival often carry a fee and their own length of stay.",

  // changes
  "changes.title": "What changed",
  "changes.between":
    "Between the <strong>{from}</strong> and <strong>{to}</strong> snapshots ({months} months): {n} passport–destination pairs changed.",
  "changes.sourceNote":
    "The latest snapshot comes from the dataset's new maintainer, and there are {months} months between the two. Most changes are real policy moves (for example the UK and Israeli ETAs), but a few may come from differences in how the two scrapers read the source.",
  "changes.onlySelected": "Only changes involving {name}",
  "changes.typeLabel": "Type of change",
  "changes.all": "All",
  "changes.gained_visa_free": "Gained visa-free",
  "changes.lost_visa_free": "Lost visa-free",
  "changes.new_eta": "New ETA",
  "changes.eta_removed": "ETA removed",
  "changes.eased": "Other easing",
  "changes.tightened": "Other tightening",
  "changes.stay_changed": "Stay length changed",
  "changes.none": "No changes of this type.",
  "changes.more": "Show {n} more of {rest}",
  "changes.note": "\"Passport → destination\": what holders of the first passport need to enter the second country. Click a row to see it on the map.",

  // about
  "about.link": "About the data",
  "about.close": "Close",
  "about.title": "About this data",
  "about.summary": "{n} snapshots of visa requirements between {from} and {to}, for {passports} passports.",
  "about.sources": "Sources",
  "about.srcVisa":
    'Visa requirements: <a href="https://github.com/ilyankou/passport-index-dataset">Passport Index dataset</a> (2019–2025) and its successor <a href="https://github.com/imorte/passport-index-data">passport-index-data</a> (2026–), MIT licence, scraped from passportindex.org.',
  "about.srcGdp": "GDP per capita: World Bank (NY.GDP.PCAP.CD), CC BY 4.0.",
  "about.srcHdi": "Human Development Index: UNDP Human Development Report, CC BY 3.0 IGO.",
  "about.srcGeo": "Boundaries: Natural Earth 1:50m, public domain. Borders follow Natural Earth's defaults and imply no position.",
  "about.downloaded": "<strong>{source}</strong>, downloaded {date}",
  "about.read": "How to read it",
  "about.readScore": "<strong>Visa-free score</strong>: destinations reachable visa-free or with a visa on arrival. ETAs are kept separate.",
  "about.readRecip": "<strong>Reciprocity</strong> compares four tiers: visa-free/on arrival, ETA, e-visa, visa required/no admission.",
  "about.readNetwork": "<strong>Network metrics</strong> weight each passport→destination edge by ease of entry (1.0 visa-free down to 0.1 visa required).",
  "about.limits": "Limitations",
  "about.limitConditional":
    "One category per pair can't express conditional access (e.g. visa-free with a valid US or Schengen visa, only by air, only for tourism). The map shows the general rule.",
  "about.limitSchengen": "Schengen stays are counted across the whole area: 90 days in any 180, not per country.",
  "about.limitCategories":
    "Categories changed over time. Before November 2020 one bucket mixed visa on arrival, ETA and e-visa; it is shown as visa on arrival (75% of it became that when the source split it), so earlier scores are approximate. ETAs are a separate category only from 12 January 2025. 2019 snapshots have no day counts.",
  "about.limitTerritories":
    "Territories missing from the visa data or the boundaries (for example Western Sahara, Northern Cyprus, Somaliland, overseas territories) are shown as \"no data\".",
  "about.limitGaps": "Snapshots are irregular, with gaps in mid-2020 and between January 2025 and February 2026.",
};

export type Key = keyof typeof en;

const fr: Record<Key, string> = {
  "page.title": "Borderless — un atlas de l'accès sans visa",
  "page.description": "Carte interactive des conditions d'entrée entre pays, de 2019 à aujourd'hui.",
  "page.tagline": "un atlas de l'accès sans visa",
  "page.skip": "Aller au panneau du pays",
  "page.search": "Choisir un passeport…",
  "page.searchLabel": "Choisir un passeport",
  "page.viewsLabel": "Vue de la carte",
  "page.map": "Carte du monde",
  "page.details": "Détails",
  "page.timeline": "Frise des instantanés",
  "page.loadError": "Un problème est survenu pendant le chargement des données. Rechargez la page.",
  "lang.switch": "EN, switch to English",
  "lang.short": "EN",
  "theme.toLight": "Passer au thème clair",
  "theme.toDark": "Passer au thème sombre",
  "map.attribution": "Frontières : Natural Earth",

  "view.access": "Accès",
  "view.reciprocity": "Réciprocité",
  "view.combo": "Deux passeports",
  "view.community": "Blocs",
  "tab.passport": "Passeport",
  "tab.insights": "Réseau",
  "tab.wealth": "Richesse",
  "tab.trips": "Voyages",
  "tab.changes": "Évolutions",

  "cat.visa_free": "Sans visa",
  "cat.visa_on_arrival": "Visa à l'arrivée",
  "cat.eta": "AVE",
  "cat.e_visa": "e-Visa",
  "cat.visa_required": "Visa obligatoire",
  "cat.no_admission": "Entrée interdite",
  "cat.home": "Pays d'origine",
  "cat.daysUpTo": "jusqu'à {days} jours",
  "detail.covid_ban": "Interdiction d'entrée liée au COVID-19",
  "detail.hayya_entry_permit": "Permis d'entrée Hayya (Coupe du monde 2022)",
  "detail.uk_electronic_visa_waiver": "Dispense de visa électronique britannique",
  "detail.voa_eta_or_e_visa": "Approximatif : avant novembre 2020, la source regroupait visa à l'arrivée, AVE et e-visa",
  "common.noData": "Pas de données",
  "common.days": "{n} jours",
  "common.daysShort": "{n} j",
  "common.notStated": "non précisé",
  "common.choose": "Choisir…",

  "app.loading": "Chargement de l'instantané du {date}…",
  "app.loadFailed": "Impossible de charger cet instantané : {error}",
  "app.snapshotLatest": "Données au {date}.",
  "app.snapshotViewing": "Vous consultez le {date} · données les plus récentes : {latest}.",
  "app.disclaimer": "Les règles de visa changent souvent. Vérifiez toujours auprès de la source gouvernementale officielle du pays de destination avant de voyager.",
  "app.sources": "Données : Passport Index dataset (MIT), Banque mondiale, PNUD, Natural Earth",
  "app.unmapped": "Zone sans correspondance",
  "app.unmappedHint": "Pas de données pour ce territoire dans le jeu de données sur les visas.",

  "legend.entryFor": "Entrée pour les titulaires d'un passeport : {name}",
  "legend.score": "Score sans visa de chaque passeport",
  "legend.fewer": "moins de destinations",
  "legend.more": "plus",
  "legend.fairness": "Score d'équité : part des relations symétriques",
  "legend.reciprocityFor": "Réciprocité pour : {name}",
  "legend.favourableTo": "Favorable pour : {name}",
  "legend.symmetric": "Symétrique",
  "legend.unfavourableTo": "Défavorable pour : {name}",
  "legend.selected": "Pays sélectionné",
  "legend.pickTwo": "Choisissez deux passeports",
  "legend.blocs": "Blocs de visas détectés dans le réseau {year}",

  "access.tipScore": "Score sans visa {score}",
  "access.tipRank": "{rank} sur {of}",
  "access.tipClick": "Cliquez pour voir où ce passeport permet d'aller",
  "access.tipSelected": "Passeport sélectionné",
  "access.tipEsc": "Échap pour désélectionner",
  "access.tipSchengen": "Schengen : les jours se cumulent sur tout l'espace (90 sur toute période de 180)",
  "access.tipFor": "pour les titulaires d'un passeport : {name}",

  "passport.introTitle": "Où un passeport peut-il vous emmener ?",
  "passport.intro":
    "Cliquez sur un pays de la carte ou recherchez-le pour voir où ses citoyens peuvent voyager, et à quelles conditions. La carte est colorée selon le <strong>score sans visa</strong> de chaque passeport : le nombre de destinations accessibles sans visa ou avec un visa à l'arrivée.",
  "passport.strongest": "Passeports les plus puissants · {date}",
  "passport.rank": "Rang",
  "passport.passport": "Passeport",
  "passport.score": "Score",
  "passport.scoreLabel": "score sans visa",
  "passport.rankLabel": "rang mondial sur {of}",
  "passport.schengenArea": "Espace Schengen",
  "passport.noteSchengen":
    "<strong>Schengen :</strong> un séjour sans visa se compte sur l'ensemble de l'espace Schengen (en général 90 jours sur toute période de 180 jours), et non pays par pays.",
  "passport.noteMixed":
    "Avant novembre 2020, la source regroupait visa à l'arrivée, AVE et e-visa dans une seule catégorie. Elle est affichée comme visa à l'arrivée (ce qu'elle est devenue en majorité) : les scores de cet instantané sont donc approximatifs.",
  "passport.noteEta": "Dans cet instantané, les AVE ne sont pas distinguées des e-visas ; la séparation commence le 12 janvier 2025.",
  "passport.noteConditional":
    "Certaines entrées dépendent de conditions (par exemple sans visa avec un visa américain ou Schengen valide, ou seulement par certains aéroports). Une seule catégorie par pays ne peut pas le montrer : chaque couleur indique la règle générale.",
  "passport.requirements": "Conditions d'entrée",
  "passport.requirementsAria": "Destinations par condition d'entrée",
  "passport.destinations": "Destinations",

  "recip.introTitle": "Qui rend la pareille ?",
  "recip.intro":
    "Sélectionnez un pays pour voir quelles relations sont symétriques, et où il accorde plus d'accès qu'il n'en reçoit. La carte est colorée selon le score d'équité de chaque pays.",
  "recip.title": "Réciprocité",
  "recip.explain":
    "Chaque relation compare ce que les citoyens d'un pays obtiennent à l'étranger avec ce que ce pays accorde en retour, sur quatre niveaux : sans visa ou à l'arrivée, AVE, e-visa, visa obligatoire.",
  "recip.aCountry": "un pays",
  "recip.symmetricShare": "relations symétriques",
  "recip.fairnessRank": "rang d'équité sur {of}",
  "recip.givesMore": "Relations où le pays donne plus qu'il ne reçoit ({n})",
  "recip.inReturn": "{out} pour ses citoyens · {back} en retour",
  "recip.most": "Les plus réciproques",
  "recip.least": "Les moins réciproques",
  "recip.country": "Pays",
  "recip.fair": "Équité",
  "recip.fairTitle": "Part des relations symétriques",
  "recip.balance": "Solde",
  "recip.balanceTitle": "(favorables − défavorables) / partenaires",
  "recip.balanceNote":
    "Un solde négatif signifie qu'un pays laisse entrer plus de monde sans visa qu'il n'en obtient en retour — souvent de petites économies touristiques qui s'ouvrent unilatéralement.",
  "recip.favourable": "Favorable",
  "recip.symmetric": "Symétrique",
  "recip.unfavourable": "Défavorable",
  "recip.tipFairness": "Score d'équité {score}",
  "recip.tipShare": "{symmetric} relations symétriques sur {partners}",
  "recip.tipPair": "{from} → {to} : {access}",

  "history.title": "Score sans visa dans le temps",
  "history.median": "Médiane mondiale",
  "history.biggest": "Plus forte variation entre deux instantanés : <strong>{delta}</strong> ({from} → {to}).",
  "history.legend":
    "Zone colorée : interdictions d'entrée liées au COVID-19. Pointillés : événements ; lignes bleues : étapes des AVE. Cliquez sur le graphique pour ouvrir cet instantané.",
  "history.covid": "Interdictions COVID-19",
  "history.yLabel": "Score sans visa",
  "chart.overTime": "{y} dans le temps",
  "chart.against": "{y} en fonction de : {x}",

  "tl.snapshot": "Instantané",
  "tl.prev": "Instantané précédent",
  "tl.next": "Instantané suivant",
  "tl.latest": "Revenir au plus récent",
  "tl.range": "Date de l'instantané",
  "tl.covidBand": "Restrictions de voyage COVID-19",
  "tl.gap": "Aucun instantané entre le {from} et le {to}",
  "tl.covidBans": "{n} interdictions d'entrée COVID-19",
  "tl.newSource": "nouveau mainteneur des données à partir de cet instantané",
  "tl.mixed": "visa à l'arrivée, AVE et e-visa non distingués",
  "tl.etaMerged": "AVE comptées comme e-visas",
  "tl.noDays": "pas de durées de séjour",

  "insights.title": "Analyse de réseau",
  "insights.method":
    "L'accès aux visas vu comme un graphe orienté : un lien du passeport vers la destination, pondéré par la facilité d'entrée (sans visa {vf}, à l'arrivée {voa}, AVE {eta}, e-visa {ev}, visa obligatoire {vr}, entrée interdite : pas de lien).",
  "insights.rankingLabel": "Classement",
  "insights.power": "Puissance du passeport",
  "insights.powerHelp": "Degré sortant pondéré : la facilité avec laquelle les titulaires de ce passeport entrent dans tous les autres pays (100 = sans visa partout).",
  "insights.openness": "Ouverture",
  "insights.opennessHelp": "Degré entrant pondéré : la facilité avec laquelle tous les autres passeports entrent (100 = sans visa pour tous).",
  "insights.centrality": "Centralité",
  "insights.centralityHelp": "PageRank sur le graphe d'accès (×1000) : élevé quand un pays est facile d'accès depuis des passeports eux-mêmes faciles d'accès.",
  "insights.fairness": "Équité",
  "insights.fairnessHelp": "Part des relations où les deux pays accordent le même niveau d'accès.",
  "insights.computedFor": "Calculé pour l'instantané du {date}.",
  "insights.blocs": "Blocs de visas",
  "insights.blocsMethod":
    "Détection de communautés de Louvain sur l'accès mutuel (chaque paire pondérée par le sens le plus restrictif), découpée récursivement tant que la découpe garde une modularité d'au moins {q}. Les libellés nomment les blocs de référence contenus dans chaque communauté.",
  "insights.showBlocs": "Afficher les blocs sur la carte",
  "insights.blocsShown": "Les blocs sont affichés sur la carte",
  "insights.countries": "{n} pays",
  "insights.contains": "Contient {list}.",
  "insights.ofMembers": "{name} ({pct} des membres)",
  "insights.note":
    "Les communautés sont une grille de lecture, pas une carte des traités : un pays rejoint le groupe avec lequel il partage le plus d'accès mutuel sans visa. Le Mercosur, par exemple, se trouve dans le vaste club sans visa autour de Schengen car ses membres sont ouverts à l'Europe autant qu'entre eux.",
  "community.partners": "{blocs} et partenaires",
  "community.mixed": "Mixte, surtout {region}",
  "community.none": "Aucune communauté",
  "community.tipContains": "contient {blocs}",

  "combo.title": "Deux passeports",
  "combo.intro":
    "Les binationaux peuvent utiliser le passeport le plus avantageux à chaque frontière. Choisissez un premier passeport sur la carte ou avec la recherche, puis le second ici.",
  "combo.first": "Premier passeport : <strong>{name}</strong>. Cliquez sur un autre pays de la carte ou choisissez-le ci-dessous.",
  "combo.second": "Second passeport",
  "combo.swap": "Inverser les deux passeports",
  "combo.added": "destinations sans visa ajoutées par : {name}",
  "combo.combined": "score sans visa combiné",
  "combo.improves": "Le second passeport ({second}) améliore l'accès à <strong>{n}</strong> destinations par rapport au premier ({first}) seul, et en ouvre <strong>{free}</strong> sans démarche préalable.",
  "combo.onlyGains": "Ne colorer que les destinations où le second passeport fait mieux",
  "combo.best": "Meilleur accès avec l'un ou l'autre passeport",
  "combo.adds": "Ce qu'apporte : {name}",
  "combo.tipBest": "Meilleur avec {via}",
  "combo.tipEither": "l'un ou l'autre passeport",
  "combo.tipThe": "le passeport : {name}",
  "combo.tipOneOfTwo": "L'un des deux passeports",

  "wealth.title": "Ouverture et richesse",
  "wealth.introGdp":
    "Chaque point est un passeport de l'instantané du {date} : son score sans visa en fonction du PIB par habitant (échelle logarithmique, dollars courants, Banque mondiale). Cliquez sur un point pour ouvrir ce passeport sur la carte.",
  "wealth.introHdi":
    "Chaque point est un passeport de l'instantané du {date} : son score sans visa en fonction de l'indice de développement humain (PNUD). Cliquez sur un point pour ouvrir ce passeport sur la carte.",
  "wealth.axisLabel": "Mesure de richesse",
  "wealth.gdp": "PIB par habitant",
  "wealth.hdi": "IDH",
  "wealth.pearson": "Corrélation de Pearson (n = {n})",
  "wealth.variance": "de la variance expliquée",
  "wealth.strongerGdp": "Passeport plus fort que ne le prédit le revenu",
  "wealth.strongerHdi": "Passeport plus fort que ne le prédit le développement",
  "wealth.weaker": "Plus faible que prévu",
  "wealth.describe": "{name} : score {score}, {delta} par rapport à l'attendu",
  "wealth.caveat":
    "Corrélation n'est pas causalité : richesse, diplomatie, pression migratoire et accords régionaux évoluent ensemble. Non représentés (pas de valeur {source}) : {list}.",
  "wealth.sourceGdp": "de PIB Banque mondiale",
  "wealth.sourceHdi": "d'IDH PNUD",
  "wealth.none": "aucun",
  "wealth.xGdp": "PIB par habitant (log)",
  "wealth.xHdi": "Indice de développement humain",
  "wealth.tipScore": "Score sans visa {score}",

  "trips.title": "Planificateur de voyage",
  "trips.intro": "Où partir sans aucune démarche préalable ? Destinations sans visa ou avec visa à l'arrivée, de la plus longue durée de séjour à la plus courte.",
  "trips.passport": "Passeport",
  "trips.region": "Région",
  "trips.allRegions": "Toutes les régions",
  "trips.subregion": "Sous-région",
  "trips.allSubregions": "Toutes les sous-régions",
  "trips.world": "le monde",
  "trips.count": "<strong>{n}</strong> destination{s} ({where}) sans démarche préalable pour les titulaires d'un passeport : {name}{when}.",
  "trips.schengen": "<strong>Schengen :</strong> les jours passés dans n'importe quel pays Schengen se cumulent dans une limite commune (90 jours sur toute période de 180).",
  "trips.destination": "Destination",
  "trips.entry": "Entrée",
  "trips.stay": "Séjour",
  "trips.nothing": "Aucune destination sans démarche préalable dans cette région.",
  "trips.note":
    "« Non précisé » signifie que la source ne donne pas de durée (par exemple liberté de circulation, ou règle impossible à exprimer en jours). Les visas à l'arrivée sont souvent payants et ont leur propre durée.",

  "changes.title": "Ce qui a changé",
  "changes.between":
    "Entre les instantanés du <strong>{from}</strong> et du <strong>{to}</strong> ({months} mois) : {n} paires passeport–destination ont changé.",
  "changes.sourceNote":
    "Le dernier instantané provient du nouveau mainteneur du jeu de données, et {months} mois séparent les deux. La plupart des changements sont de vraies évolutions (par exemple les AVE britannique et israélienne), mais quelques-uns peuvent venir de différences entre les deux outils de collecte.",
  "changes.onlySelected": "Seulement les changements concernant : {name}",
  "changes.typeLabel": "Type de changement",
  "changes.all": "Tous",
  "changes.gained_visa_free": "Sans visa gagné",
  "changes.lost_visa_free": "Sans visa perdu",
  "changes.new_eta": "Nouvelle AVE",
  "changes.eta_removed": "AVE supprimée",
  "changes.eased": "Autre assouplissement",
  "changes.tightened": "Autre durcissement",
  "changes.stay_changed": "Durée de séjour modifiée",
  "changes.none": "Aucun changement de ce type.",
  "changes.more": "Afficher {n} de plus sur {rest}",
  "changes.note": "« Passeport → destination » : ce dont les titulaires du premier passeport ont besoin pour entrer dans le second pays. Cliquez sur une ligne pour la voir sur la carte.",

  "about.link": "À propos des données",
  "about.close": "Fermer",
  "about.title": "À propos des données",
  "about.summary": "{n} instantanés des conditions de visa entre le {from} et le {to}, pour {passports} passeports.",
  "about.sources": "Sources",
  "about.srcVisa":
    'Conditions de visa : <a href="https://github.com/ilyankou/passport-index-dataset">Passport Index dataset</a> (2019–2025) et son successeur <a href="https://github.com/imorte/passport-index-data">passport-index-data</a> (2026–), licence MIT, collectés sur passportindex.org.',
  "about.srcGdp": "PIB par habitant : Banque mondiale (NY.GDP.PCAP.CD), CC BY 4.0.",
  "about.srcHdi": "Indice de développement humain : Rapport sur le développement humain du PNUD, CC BY 3.0 IGO.",
  "about.srcGeo": "Frontières : Natural Earth 1:50m, domaine public. Les frontières suivent les choix par défaut de Natural Earth et n'impliquent aucune prise de position.",
  "about.downloaded": "<strong>{source}</strong>, téléchargé le {date}",
  "about.read": "Comment lire la carte",
  "about.readScore": "<strong>Score sans visa</strong> : destinations accessibles sans visa ou avec un visa à l'arrivée. Les AVE sont comptées à part.",
  "about.readRecip": "<strong>La réciprocité</strong> compare quatre niveaux : sans visa/à l'arrivée, AVE, e-visa, visa obligatoire/entrée interdite.",
  "about.readNetwork": "<strong>Les mesures de réseau</strong> pondèrent chaque lien passeport→destination selon la facilité d'entrée (de 1,0 sans visa à 0,1 visa obligatoire).",
  "about.limits": "Limites",
  "about.limitConditional":
    "Une seule catégorie par paire ne peut pas exprimer un accès conditionnel (par exemple sans visa avec un visa américain ou Schengen valide, seulement par voie aérienne, seulement pour le tourisme). La carte montre la règle générale.",
  "about.limitSchengen": "Les séjours Schengen se comptent sur l'ensemble de l'espace : 90 jours sur toute période de 180, et non par pays.",
  "about.limitCategories":
    "Les catégories ont changé au fil du temps. Avant novembre 2020, une seule catégorie mélangeait visa à l'arrivée, AVE et e-visa ; elle est affichée comme visa à l'arrivée (75 % en sont devenus lors de la séparation), donc les scores antérieurs sont approximatifs. Les AVE ne forment une catégorie à part que depuis le 12 janvier 2025. Les instantanés de 2019 n'ont pas de durées de séjour.",
  "about.limitTerritories":
    "Les territoires absents des données de visa ou des frontières (par exemple le Sahara occidental, Chypre du Nord, le Somaliland, les territoires d'outre-mer) sont affichés « pas de données ».",
  "about.limitGaps": "Les instantanés sont irréguliers, avec des trous mi-2020 et entre janvier 2025 et février 2026.",
};

const DICTS: Record<Lang, Record<Key, string>> = { en, fr };

const REGIONS_FR: Record<string, string> = {
  Africa: "Afrique",
  Americas: "Amériques",
  Asia: "Asie",
  Europe: "Europe",
  Oceania: "Océanie",
  Antarctica: "Antarctique",
  "Australia and New Zealand": "Australie et Nouvelle-Zélande",
  Caribbean: "Caraïbes",
  "Central America": "Amérique centrale",
  "Central Asia": "Asie centrale",
  "Eastern Africa": "Afrique de l'Est",
  "Eastern Asia": "Asie de l'Est",
  "Eastern Europe": "Europe de l'Est",
  Melanesia: "Mélanésie",
  Micronesia: "Micronésie",
  "Middle Africa": "Afrique centrale",
  "Northern Africa": "Afrique du Nord",
  "Northern America": "Amérique du Nord",
  "Northern Europe": "Europe du Nord",
  Polynesia: "Polynésie",
  "South America": "Amérique du Sud",
  "South-Eastern Asia": "Asie du Sud-Est",
  "Southern Africa": "Afrique australe",
  "Southern Asia": "Asie du Sud",
  "Southern Europe": "Europe du Sud",
  "Western Africa": "Afrique de l'Ouest",
  "Western Asia": "Asie de l'Ouest",
  "Western Europe": "Europe de l'Ouest",
  "Seven seas (open ocean)": "Océans",
  Unknown: "Inconnu",
};

const BLOCS: Record<string, { short: Record<Lang, string>; name: Record<Lang, string> }> = {
  SCHENGEN: { short: { en: "Schengen", fr: "Schengen" }, name: { en: "Schengen Area", fr: "Espace Schengen" } },
  ECOWAS: { short: { en: "ECOWAS", fr: "CEDEAO" }, name: { en: "Economic Community of West African States", fr: "Communauté économique des États de l'Afrique de l'Ouest" } },
  MERCOSUR: { short: { en: "Mercosur", fr: "Mercosur" }, name: { en: "Mercosur (full members)", fr: "Mercosur (membres de plein droit)" } },
  CAN: { short: { en: "CAN", fr: "CAN" }, name: { en: "Andean Community", fr: "Communauté andine" } },
  GCC: { short: { en: "GCC", fr: "CCG" }, name: { en: "Gulf Cooperation Council", fr: "Conseil de coopération du Golfe" } },
  EAC: { short: { en: "EAC", fr: "CAE" }, name: { en: "East African Community", fr: "Communauté d'Afrique de l'Est" } },
  CEMAC: { short: { en: "CEMAC", fr: "CEMAC" }, name: { en: "Central African Economic and Monetary Community", fr: "Communauté économique et monétaire de l'Afrique centrale" } },
  CARICOM: { short: { en: "CARICOM", fr: "CARICOM" }, name: { en: "Caribbean Community (sovereign members)", fr: "Communauté caribéenne (membres souverains)" } },
  ASEAN: { short: { en: "ASEAN", fr: "ASEAN" }, name: { en: "Association of Southeast Asian Nations", fr: "Association des nations de l'Asie du Sud-Est" } },
  EAEU: { short: { en: "EAEU", fr: "UEE" }, name: { en: "Eurasian Economic Union", fr: "Union économique eurasiatique" } },
  SADC: { short: { en: "SADC", fr: "SADC" }, name: { en: "Southern African Development Community", fr: "Communauté de développement d'Afrique australe" } },
};

let current: Lang = "en";

function readStored(): Lang | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "en" || value === "fr" ? value : null;
  } catch {
    return null;
  }
}

/** Language from ?lang=, then the last choice, then the browser. */
export function detectLang(search: string = location.search): Lang {
  const param = new URLSearchParams(search).get("lang");
  if (param === "en" || param === "fr") return param;
  const stored = readStored();
  if (stored) return stored;
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private mode: not remembered */
  }
}

export function lang(): Lang {
  return current;
}

export function locale(): string {
  return current === "fr" ? "fr-FR" : "en-GB";
}

export function t(key: Key, vars: Record<string, string | number> = {}): string {
  const text = DICTS[current][key] ?? en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}

/** Plural suffix: French treats 0 and 1 as singular, English only 1. */
export function plural(n: number): string {
  return (current === "fr" ? n <= 1 : n === 1) ? "" : "s";
}

export function regionName(name: string | null | undefined): string {
  if (!name) return "";
  return current === "fr" ? REGIONS_FR[name] ?? name : name;
}

export function blocShort(code: string): string {
  return BLOCS[code]?.short[current] ?? code;
}

export function blocName(code: string, fallback: string): string {
  return BLOCS[code]?.name[current] ?? fallback;
}

export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** US dollars without decimals, e.g. US$44,461 or 44 461 $US. */
export function money(n: number): string {
  return new Intl.NumberFormat(locale(), { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

/** "Label: value" in English, "Label : value" in French. */
export function colon(): string {
  return current === "fr" ? "\u00a0: " : ": ";
}

/** 12.3% in English, 12,3 % in French. */
export function percent(n: number, digits = 0): string {
  const value = formatNumber(n, digits);
  return current === "fr" ? `${value}\u202f%` : `${value}%`;
}

/** For tests: the key sets of both languages. */
export const dictionaries = DICTS;
