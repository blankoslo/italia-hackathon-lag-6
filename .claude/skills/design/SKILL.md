# Friluftskompis — Design Brief

## Produkt

Friluftskompis er en mobil-første app (390px) som samler hele planleggingen av norske frilutsturer på ett sted. Den erstatter Yr, UT.no, DNT, Google Maps, Excel og Messenger med én sammenhengende flate.

**Kjerneflyt:** Finn tur → Sjekk vær og tilgjengelighet → Inviter gjengen → Lag pakkeliste → Naviger offline → Gjør opp regningen

**Brukertyper:**

- Turplanlegger — organiserer, tar initiativ
- Turdeltaker — blir invitert, trenger enkel tilgang uten app-installasjon
- Gruppeleder — koordinerer utstyr og kostnader
- Soloturer — planlegger og går alene

---

## Visuell identitet

### Tone

Mørk, rolig og tillitsvekkende. Cover art-referansen er mørk kullbakgrunn med krem/gull linjekunst (telt, fjell, furutrær) — det er brandens visuelle tone.

### Farger — bruk alltid token-navnene

**Brand (blå-lilla skala):**

- brand-100: #dcdeff — hover-states og bakgrunner
- brand-200: #bfc3ff — subtile accents
- brand-300: #959bff — sekundære elementer
- brand-400: #4f59fb — PRIMÆR handlingsfarge (knapper, aktive states, lenker)
- brand-500: #2f3597 — hover på primærknapper
- brand-600: #202464 — dypeste, brukes sparsomt

**Neutral:**

- neutral-100: #d9d9d9
- neutral-200: #a6a6a6
- neutral-300: #808080
- neutral-400: #666666
- neutral-500: #4d4d4d
- neutral-600: #1a1a1a — dark charcoal — PRIMÆR bakgrunnsfarge
- black: #000000 / white: #ffffff

**System:**

- info: #1D4ED8 / info-light: #DBEAFE
- warning: #e15b02 / warning-light: #ffdac2
- success: #0f8402 / success-light: #d4ffcf
- error: #bf0000 / error-light: #ffcece

**Semantiske tokens:**

- Bakgrunner: background-white, background-primary, background-primary-hover, background-disabled
- Tekst: text-placeholder, text-white, text-black, text-primary, text-hover, text-disabled
- Border: border-default, border-primary, border-disabled

---

## Typografi

- font-family-1: Inter — all UI-tekst, labels, knapper, body
- font-family-2: Source Serif 4 — display og store overskrifter

Font weights: regular (400), semibold (600), bold (700)
Font sizes: 12 · 14 · 16 · 18 · 24 · 32 · 40 · 48px

Text styles:

- heading-small, heading-medium, heading-large — Source Serif 4
- body-xsmall, body-small, body-medium, body-large — Inter

---

## Spacing, radius og stroke

Spacing: spacing-1: 4px · spacing-2: 8px · spacing-3: 16px · spacing-4: 24px · spacing-5: 32px · spacing-6: 48px · spacing-7: 64px · spacing-8: 96px

Radius:

- radius-small: 4px — chips, tags, små elementer
- radius-medium: 16px — kort, inputfelter, modaler
- radius-full: 100px — piller, avatarer

Stroke: 1px

---

## Nøkkelkomponenter

**Primary button:**
bg brand-400, text white, radius-medium, padding 16px 24px
button-text style, Inter semibold, min 44px høyde
hover: brand-500 / disabled: background-disabled + text-disabled

**Secondary button:**
bg transparent, border 1px border-primary, text brand-400, samme radius/padding

**Kort:**
bg neutral-500 på neutral-600 bakgrunn, border 1px border-default, radius-medium, padding 16px

**AI-chip — alltid på AI-generert innhold:**
Label: "✦ AI-forslag"
bg brand-100, text brand-600, border 1px brand-300, radius-full
body-xsmall Inter semibold

**Deltakerstatusrad:**
Avatar 36px sirkel radius-full, bg brand-400, initialer i white
Status-chips: Akseptert (success-light/success), Venter (warning-light/warning), Avslått (neutral-200/neutral-400)

**Vær-chip:**
ikon + temp + vind, bg info-light, text info, radius-full

**Dag-for-dag-etappekort:**
dag-nummer, Fra→Til, 3 stats-chips (distanse/høydemeter/tid), vær-chip, AI-chip hvis relevant

---

## Interaksjonsprinsipper

1. Én primærknapp per skjerm
2. AI alltid merket med "✦ AI-forslag"-chip
3. Norsk throughout — "mandag 12. mai", "14 km", "450 moh"
4. Mørkt UI — neutral-600 som standard bakgrunn
5. Progressiv avsløring — minimum info, mer på interaksjon

---

## Skjermstruktur (390px mobil)

Nav bar: 56px, bg neutral-600
[← tilbake] [Tittel i heading-small Source Serif 4] [handling]

Innholdsområde: padding 0 16px, bg neutral-600

Bottom tab bar: 83px inkl. safe area
bg neutral-600, border-top 1px border-default
[Utforsk] [Mine turer] [Gruppe] [Meg] — aktiv tab i brand-400

Kart-skjermer: full-bleed kart, søkefelt flyter over (bg neutral-500), bottom sheet peek 120px

---

## Skjerm å generere fra denne briefen

Turdetalj-skjerm — Decide-fasen, Vennegjengen-scenariet
Tur: 3 dager Rondane, mars. Deltakere: Kari, Ola, Marie.

Inneholder topp til bunn:

1. Nav bar — mørk, "← Tilbake", "Rondane mars" Source Serif 4, deleikon
2. Kartthumbnail — 16:9, topografisk med rutelinje i brand-400
3. Tur-metadata — 3 dager · 42 km · medium — tre chips i rad
4. Deltakere-rad — avatarer KA/OL/MA med status-chips
5. Dag-for-dag tidslinje — 3 etappekort:
   Dag 1: Spranghaugen → Rondvassbu, 14 km, 450 moh, 6t, vær-chip
   Dag 2: Rondvassbu → Bjørnhollia, 11 km, 320 moh, 5t + AI-chip "Flytt til søndag — bedre vær"
   Dag 3: Bjørnhollia → Dørålseter, 17 km, 280 moh, 5t
6. Primary button "Se pakkeliste" (brand-400)
7. Secondary button "Inviter flere"

390×844px, mørk bakgrunn neutral-600, norsk tekst, Inter + Source Serif 4.
