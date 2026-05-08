# APIs · Friluftskompis Hackathon 2026
API-er
------

Tilgjengelige API-er for produktet vi bygger. Klikk på en rad for å se full beskrivelse, endepunkter, eksempler og tips. All tekst ligger i DOM-en så Claude Code og andre verktøy kan scrape siden direkte.

Ingen registrering, ingen API-nøkler. Sett en User-Agent og hent data.

Yr / MET NorwayVærUser-Agent header

Værprognoser for hele verden, nowcast for Norden. Gratis under CC BY 4.0.

Base URL

`https://api.met.no`

Autentisering

User-Agent header

Rate limit

20 requests/sekund per applikasjon. Bruk If-Modified-Since for caching.

#### Endepunkter



* Path: /weatherapi/locationforecast/2.0/compact
  * Beskrivelse: 9-dagers prognose (temperatur, nedbør, vind). Kompakt format.
* Path: /weatherapi/locationforecast/2.0/complete
  * Beskrivelse: Samme som compact, men med alle tilgjengelige parametere.
* Path: /weatherapi/nowcast/2.0/complete
  * Beskrivelse: Neste 2 timer med høy presisjon. Kun Norden.
* Path: yr.no/api/v0/regions/{id}/watertemperatures
  * Beskrivelse: Sanntid badetemperatur. Regionkoder: NO-03 (Oslo), NO-46 (Vestland) osv.


#### Eksempler

```
# Værprognose for Rondane (62.0°N, 9.7°E)
curl -H "User-Agent: Friluftskompis/1.0 team@blank.no" \
  "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=62.0&lon=9.7"
```


```
# Badetemperaturer i Vestland
curl -H "User-Agent: Friluftskompis/1.0 team@blank.no" \
  "https://www.yr.no/api/v0/regions/NO-46/watertemperatures"
```


#### Tips

*   Trunker koordinater til maks 4 desimaler. Flere desimaler gir ikke bedre data, bare cache-misser.
*   Respekter Expires-headeren. MET oppdaterer prognoser ca hver time.
*   HTTPS er påkrevd. HTTP fungerer ikke.
*   User-Agent må inneholde appnavn og kontaktinfo. Generiske verdier (wget, okhttp, Java) blir blokkert.

Kartverket / GeonorgeKart og stedsnavnIngen

Topografiske kart, turkart, stedsnavn og høydedata for hele Norge. CC BY 4.0.

Base URL

`https://cache.kartverket.no (kart) og https://ws.geonorge.no (tjenester)`

Autentisering

Ingen

Rate limit

Ingen publiserte grenser på cache.kartverket.no. Legacy opencache.statkart.no har 10 000 kall per IP per dag.

#### Endepunkter



* Path: cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png
  * Beskrivelse: Topografisk kart (fargekart). Direkte tile-URL for Leaflet eller MapLibre.
* Path: ws.geonorge.no/stedsnavn/v1/sted?sok={query}
  * Beskrivelse: Stedsnavn-søk. Over en million stedsnavn med koordinater.
* Path: cache.kartverket.no/v1/wmts/1.0.0/toporaster/default/webmercator/{z}/{y}/{x}.png
  * Beskrivelse: Turkart (raster). Stier og høydekurver.


#### Eksempler

```
# Søk etter stedsnavn
curl "https://ws.geonorge.no/stedsnavn/v1/sted?sok=Trolltunga&treffPerSide=5"
```


```
# Hent en karttile (zoom 10, midt i Norge)
curl -o tile.png "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/10/545/272.png"
```


#### Tips

*   Bruk cache.kartverket.no (nytt), ikke opencache.statkart.no (legacy med lavere grenser).
*   Leaflet-oppsett: L.tileLayer("https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png", { attribution: "© Kartverket" }).
*   Stedsnavn-APIet returnerer koordinater, kommunenavn og navnetype. Egnet for autocomplete.
*   Husk attribution: © Kartverket må vises på kartet.

EnturKollektivrutingET-Client-Name header

Kollektivruting for hele Norge: buss, tog, båt, trikk. Norsk lisens for offentlige data (NLOD).

Base URL

`https://api.entur.io`

Autentisering

ET-Client-Name header

Rate limit

Ikke dokumentert. Uten ET-Client-Name-header får du aggressiv throttling. Med header fungerer det greit for hackathon.

#### Endepunkter



* Path: /journey-planner/v3/graphql
  * Beskrivelse: Reiseplanlegger (A til B). GraphQL. Sanntid og rutetabeller.
* Path: /geocoder/v1/autocomplete?text={query}
  * Beskrivelse: Søk etter holdeplasser og steder. Egnet for autocomplete.
* Path: /geocoder/v1/reverse?point.lat={lat}&point.lon={lon}
  * Beskrivelse: Finn nærmeste holdeplass fra koordinat.


#### Eksempler

```
# Søk etter holdeplass
curl -H "ET-Client-Name: blank-friluftskompis" \
  "https://api.entur.io/geocoder/v1/autocomplete?text=Otta%20stasjon&size=3"
```


```
# Reisesøk (GraphQL): neste avganger fra Oslo S
curl -X POST "https://api.entur.io/journey-planner/v3/graphql" \
  -H "ET-Client-Name: blank-friluftskompis" \
  -H "Content-Type: application/json" \
  -d '{"query":"{stopPlace(id:\"NSR:StopPlace:59872\"){name estimatedCalls(numberOfDepartures:3){expectedDepartureTime destinationDisplay{frontText}}}}"}'
```


#### Tips

*   Bruk GraphQL Explorer for å bygge queries interaktivt: https://api.entur.io/graphql-explorer/journey-planner-v3.
*   Journey Planner v3 er GraphQL-only. POST til endepunktet med JSON body.
*   Geocoder-APIet er REST og enklere å starte med. Bra for holdeplass-søk.
*   NSR:StopPlace-IDer er stabile. Hardkod gjerne populære utgangspunkt (Oslo S = NSR:StopPlace:59872).

Varsom / NVESkred- og farevarselIngen

Skredvarsel, flomvarsel og faredata for hele Norge. Viktig for sikkerhet på fjelltur.

Base URL

`https://api01.nve.no`

Autentisering

Ingen

Rate limit

Ikke dokumentert. Oppdater hver 30 til 60 minutter.

#### Endepunkter



* Path: /hydrology/forecast/avalanche/v6.2.1/api/AvalancheWarningByRegion/Simple/{regionId}/{days}/{from}/{to}
  * Beskrivelse: Skredvarsel per region. Faregrad 1 til 5, hovedtekst, gyldighet.
* Path: /hydrology/forecast/flood/v1.0.10/Warning/{lang}/{from}/{to}
  * Beskrivelse: Flomvarsel. Faregrader og varslede områder.
* Path: /hydrology/forecast/landslide/v1.0.8/api/Warning/Id/{id}/{days}
  * Beskrivelse: Jordskredvarsel.


#### Eksempler

```
# Skredvarsel for Jotunheimen (region 3028), neste 2 dager
curl "https://api01.nve.no/hydrology/forecast/avalanche/v6.2.1/api/AvalancheWarningByRegion/Simple/3028/2/2026-05-01/2026-05-02"
```


```
# Alle skredregioner
curl "https://api01.nve.no/hydrology/forecast/avalanche/v6.2.1/api/Region/1"
```


#### Tips

*   DangerLevel 1 til 5 (1 = liten, 5 = ekstrem). Vis med fargekode i appen.
*   Bruk /Region-endepunktet for å hente alle region-IDer og polygoner.
*   Skredvarsel er mest relevant i vintersesongen, men sjekk året rundt.
*   Kreditering: "Varsler fra NVE/Varsom" med lenke til varsom.no.

OpenStreetMapKart og POIUser-Agent header

Frie kart, POI-data og turstier. Bakgrunnskart og datakilde for hytter, utsiktspunkter og vannkilder.

Base URL

`https://tile.openstreetmap.org (tiles) og https://overpass-api.de (POI)`

Autentisering

User-Agent header

Rate limit

Ikke dokumentert. Cache tiles lokalt i 7 dager. Overpass: maks 2 samtidige kall.

#### Endepunkter



* Path: tile.openstreetmap.org/{z}/{x}/{y}.png
  * Beskrivelse: Standard raster-tiles. Bruk med Leaflet eller MapLibre.
* Path: overpass-api.de/api/interpreter
  * Beskrivelse: Overpass API for POI-spørringer (shelters, viewpoints, water).


#### Eksempler

```
# Finn turisthytter og utsiktspunkter nær Rondane
curl -X POST "https://overpass-api.de/api/interpreter" \
  -d "data=[out:json][bbox:61.8,9.5,62.2,10.0];(node[tourism=alpine_hut];node[tourism=viewpoint];node[amenity=shelter];);out body;"
```


```
# Hent en karttile
curl -o tile.png "https://tile.openstreetmap.org/10/545/272.png"
```


#### Tips

*   For penere turkart vurder MapTiler (gratis tier, 100k loads per måned) eller Thunderforest Outdoors.
*   Overpass Turbo (overpass-turbo.eu) er bra for å prototype spørringer visuelt før du koder.
*   Kombiner Kartverket-tiles som bakgrunn med Overpass for POI-data. Kartverket har bedre norsk turkart.
*   Attribution er påkrevd: © OpenStreetMap contributors.
*   HTTPS er påkrevd. Kun single-domain (tile.openstreetmap.org), ikke a/b/c-subdomener.

UT.no / DNTHytter og ruterIngen

GraphQL API med 1 999 hytter og 1 395 merkede ruter. GeoJSON med høydedata, sengeplasser, servicenivå og gradering.

Base URL

`https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql`

Autentisering

Ingen

Rate limit

Ikke dokumentert. Bruk fornuftig.

#### Endepunkter



* Path: cabins(paging, filter)
  * Beskrivelse: Søk eller list hytter. 1 999 totalt. Returnerer id, navn, serviceLevel, geojson, senger.
* Path: cabin(id)
  * Beskrivelse: Hent én hytte med full beskrivelse, sengeplasser, servicestatus, fasiliteter.
* Path: cabinsNear(input)
  * Beskrivelse: Finn hytter nær et punkt. Input: koordinater og radius.
* Path: routes(paging, filter)
  * Beskrivelse: Søk eller list ruter. 1 395 totalt. Distanse, gradering, varighet, GeoJSON-linje.
* Path: route(id)
  * Beskrivelse: Hent én rute med full GeoJSON (inkluderer høydedata), start, slutt og beskrivelse.
* Path: pois(paging, filter) / poisNear(input)
  * Beskrivelse: Utsiktspunkter, rasteplasser og andre POI-er.
* Path: areas(paging, filter)
  * Beskrivelse: Turområder med navn og grenser.
* Path: search(query)
  * Beskrivelse: Fritekstsøk på tvers av hytter, ruter og POI-er.


#### Eksempler

```
# Hent 5 hytter med koordinater
curl -X POST "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql" \
  -H "Content-Type: application/json" -H "Origin: https://ut.no" \
  -d '{"query":"{ cabins(paging:{first:5}) { totalCount edges { node { id name serviceLevel dntCabin geojson } } } }"}'
```


```
# Hent én hytte med full detalj
curl -X POST "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql" \
  -H "Content-Type: application/json" -H "Origin: https://ut.no" \
  -d '{"query":"{ cabin(id:10344) { id name description serviceLevel bedsStaffed bedsSelfService bedsNoService geojson } }"}'
```


```
# Hent 3 ruter med metadata
curl -X POST "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql" \
  -H "Content-Type: application/json" -H "Origin: https://ut.no" \
  -d '{"query":"{ routes(paging:{first:3}) { totalCount edges { node { id name distance gradingAb durationHoursAb placeA placeB } } } }"}'
```


#### Tips

*   Sett Origin: https://ut.no og Content-Type: application/json som headers.
*   GraphQL betyr at du bare henter feltene du trenger. Hold queries kompakte.
*   GeoJSON for hytter er Point med \[lon, lat, altitude\]. For ruter er det LineString med høydedata.
*   serviceLevel-verdier: STAFFED (betjent), SELF\_SERVICE (selvbetjent), NO\_SERVICE (ubetjent), RENTAL (utleie).
*   Bruk cabinsNear og routesNear for radius-søk rundt et punkt. Egnet for "hytter i nærheten"-funksjonalitet.
*   Paginering bruker cursor-basert paging: first, after. endCursor fra pageInfo sendes som after i neste kall.

iNaturKommersielle hytterIngen

Søke-API med 5 639 tilbud (hytter, fiske, jakt). Pris, sengeplasser, fasiliteter, fylke og kommune.

Base URL

`https://www.inatur.no/internal/search`

Autentisering

Ingen

Rate limit

Ikke dokumentert. Bruk fornuftig.

#### Endepunkter



* Path: /internal/search?type=hyttetilbud
  * Beskrivelse: Søk etter hytter. 12 resultater per side. Paginering med ?side=0,1,2 osv.
* Path: /internal/search?type=hyttetilbud&side=0
  * Beskrivelse: Første side med hytteresultater.
* Path: /internal/search (uten filter)
  * Beskrivelse: Alle 5 639 tilbud inkludert fiske, jakt, småvilt.


#### Eksempler

```
# Hent første side med hyttetilbud
curl "https://www.inatur.no/internal/search?type=hyttetilbud&side=0" \
  -H "Accept: application/json"
```


```
# Søk alle tilbudstyper
curl "https://www.inatur.no/internal/search" -H "Accept: application/json"
```


#### Tips

*   Returfelter: id, tittel, fraPris, antallSenger, amenities, fylker, kommuner, kortBeskrivelse, thumbnailImageSrc.
*   amenities inkluderer heating, electricity, wifi, parking, water, cooking, refrigerator, pet, disabilityAccessible.
*   Mangler koordinater i søkeresultatene. Bruk kommune eller fylke for grov lokalisering, eller geokod med Kartverket.
*   tilbydernavn gir navn på utleier (jeger- og fiskerforeninger, grunneiere).
*   Bildene ligger på Cloudflare Image Delivery. thumbnailImageSrc kan brukes direkte.
*   Kombiner med UT.no for komplett hyttebilde (DNT-hytter pluss kommersielle).

MiljødirektoratetFriluftsområder og naturvernIngen

Kartlagte friluftslivsområder i hele Norge med verdivurdering, egnethet og brukerfrekvens. ArcGIS REST API. Inkluderer statlig sikra friluftsområder og vernede naturområder.

Base URL

`https://kart.miljodirektoratet.no/arcgis/rest/services`

Autentisering

Ingen

Rate limit

Ikke dokumentert. Standard ArcGIS REST. Bruk resultRecordCount for å begrense resultater.

#### Endepunkter



* Path: friluftsliv_kartlagt/MapServer/0/query
  * Beskrivelse: Kartlagte friluftsområder med verdi, type, egnethet og brukerfrekvens.
* Path: friluftsliv_statlig_sikra/MapServer/0/query
  * Beskrivelse: Statlig sikra friluftsområder (offentlig tilgjengelige). Med driftsansvarlig og tilgjengelighet.
* Path: vern/MapServer/query
  * Beskrivelse: Vernede naturområder (nasjonalparker, naturreservater). Geometri og verneformål.


#### Eksempler

```
# Hent 5 kartlagte friluftsområder
curl "https://kart.miljodirektoratet.no/arcgis/rest/services/friluftsliv_kartlagt/MapServer/0/query?where=1%3D1&outFields=*&resultRecordCount=5&f=json"
```


```
# Søk etter friluftsområder i en kommune (0301 = Oslo)
curl "https://kart.miljodirektoratet.no/arcgis/rest/services/friluftsliv_kartlagt/MapServer/0/query?where=kommune%3D0301&outFields=*&f=json"
```


```
# Statlig sikra friluftsområder
curl "https://kart.miljodirektoratet.no/arcgis/rest/services/friluftsliv_statlig_sikra/MapServer/0/query?where=1%3D1&outFields=*&resultRecordCount=5&f=json"
```


#### Tips

*   omraadetype-verdier: Utfartsomraade, Naerturterreng, Sti\_loeype, Badeplass, Annet friluftslivsomraade.
*   omraadeverdi: SvaertViktigFriluftslivsomraade, ViktigFriluftslivsomraade, RegistrertFriluftslivsomraade.
*   brukerfrekvens: Hoey, Middels, Lav. Kombiner med Yr-vær for turanbefaling.
*   Geometri er polygoner (ESRI JSON rings). Konverter til GeoJSON med terraformer eller turf.js.
*   faktaark-feltet gir URL til Naturbase-faktaark med detaljert beskrivelse.

Vegvesen TrafikkdataTrafikkmengdeIngen

Sanntids trafikktall fra 9 963 målepunkter på norske veier. Åpent GraphQL API uten autentisering. Volum per time, dag og måned. Dekning på europa- og riksveier samt mange fylkesveier.

Base URL

`https://trafikkdata-api.atlas.vegvesen.no/`

Autentisering

Ingen

Rate limit

Ikke dokumentert. Bruk fornuftig med presise queries.

#### Endepunkter



* Path: trafficRegistrationPoints
  * Beskrivelse: List alle 9 963 målepunkter med navn, koordinater og vegreference.
* Path: trafficData(trafficRegistrationPointId)
  * Beskrivelse: Hent trafikkvolum for et punkt. byHour, byDay, byMonth med from/to-filter.
* Path: areas
  * Beskrivelse: Områder (fylker eller regioner) for filtrering.
* Path: roadCategories
  * Beskrivelse: Vegkategorier: E (europa), R (riks), F (fylke).


#### Eksempler

```
# Hent alle målepunkter (GraphQL)
curl -X POST "https://trafikkdata-api.atlas.vegvesen.no/" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ trafficRegistrationPoints { id name location { coordinates { latLon { lat lon } } roadReference { shortForm } } } }"}'
```


```
# Hent trafikk per time for et punkt (1. mai 2025)
curl -X POST "https://trafikkdata-api.atlas.vegvesen.no/" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ trafficData(trafficRegistrationPointId: \"52742V2282262\") { volume { byHour(from: \"2025-05-01T00:00:00+02:00\", to: \"2025-05-01T12:00:00+02:00\") { edges { node { from to total { volumeNumbers { volume } } } } } } } }"}'
```


#### Tips

*   Bruk trafficRegistrationPoints for å finne målepunkter nær en turstart, deretter trafficData for volum.
*   roadReference.shortForm gir vegnummer (f.eks. EV6 S26D1 m1470). Nyttig for å koble til veistrekninger.
*   Trafikkdata kan brukes til "beste tidspunkt for avreise" eller "unngå rushtrafikk til turstart".
*   GraphQL: hent kun feltene du trenger. Et kall med alle 9 963 punkter tar tid hvis du ber om alt.
*   Test queries i GraphQL Playground: https://trafikkdata.atlas.vegvesen.no.

NVDBRasteplasser, fjelloverganger, bomUser-Agent header (browser-lik)

1 091 rasteplasser langs norske veier fra Nasjonal vegdatabank. Areal, parkering, fasiliteter. REST API med GeoJSON-lignende respons.

Base URL

`https://nvdbapiles-v3.atlas.vegvesen.no`

Autentisering

User-Agent header (browser-lik)

Rate limit

Ikke dokumentert. Fornuftig bruk.

#### Endepunkter



* Path: /vegobjekter/39
  * Beskrivelse: Rasteplasser. 1 091 stk. Med areal, antall plasser, dekke, fasiliteter.
* Path: /vegobjekter/319
  * Beskrivelse: Kolonnestrekninger. 85 stk. Fjellovergangar med kolonnekjøring (vinterstengte veier).
* Path: /vegobjekter/45
  * Beskrivelse: Bomstasjoner. 449 stk. Med takster og rushtidspriser.
* Path: /vegobjekter/856
  * Beskrivelse: Trafikkreguleringer. 6 766 stk. Kjøreforbud, restriksjoner.


#### Eksempler

```
# Hent 5 rasteplasser med egenskaper og lokasjon
curl "https://nvdbapiles-v3.atlas.vegvesen.no/vegobjekter/39?inkluder=egenskaper,lokasjon&antall=5" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Friluftskompis" \
  -H "Accept: application/json"
```


```
# Hent kolonnestrekninger (fjellovergangar)
curl "https://nvdbapiles-v3.atlas.vegvesen.no/vegobjekter/319?inkluder=egenskaper,lokasjon&antall=5" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Friluftskompis" \
  -H "Accept: application/json"
```


#### Tips

*   Bruk ?inkluder=egenskaper,lokasjon for å få både data og koordinater.
*   Filtrer geografisk med ?fylke=50 (Trøndelag), ?kommune=5001 (Trondheim) eller ?kartutsnitt=bbox.
*   Objekttype-katalog: /vegobjekttyper gir full liste over alle 1000+ objekttyper i NVDB.
*   Kolonnestrekninger (319) er egnet for "er fjellovergangen åpen?"-funksjonalitet.
*   Koordinater er i UTM33/EPSG:25833. Konverter til WGS84 med proj4js for kartvisning.

Krever konto, abonnement eller credentials. Tilgjengelig via Blanks oppsett.

Apify (Airbnb Scraper)Kommersielle utleieobjekterApify-konto, API-token

Scraper for Airbnb-utleieobjekter. Henter pris, koordinater, rating, bilder og fasiliteter for en gitt destinasjon.

Base URL

`https://api.apify.com/v2/acts/NDa1latMI7JHJzSYU/runs`

Autentisering

Apify-konto, API-token

Rate limit

Ikke dokumentert.

Kostnad

$1.25 per 1 000 resultater. Gratis tier: $5 per måned inkludert. Maks ~240 resultater per søk.

#### Endepunkter



* Path: /v2/acts/NDa1latMI7JHJzSYU/runs
  * Beskrivelse: Start scraper med locationQueries og maxResults. Output: JSON med id, coordinates, price, rating, amenities, images, host.


#### Eksempler

```
curl "https://api.apify.com/v2/acts/NDa1latMI7JHJzSYU/runs" \
  -H "Authorization: Bearer <APIFY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"locationQueries":["Rondane, Norway"],"maxResults":50}'
```


#### Tips

*   Bruk locationQueries med norske stedsnavn: "Lofoten", "Hemsedal", "Trysil".
*   Resultater inkluderer latitude og longitude.
*   Kombiner med UT.no-hytter for komplett overnattingsbilde (DNT pluss privat).
*   API-token finnes i Blanks 1Password.

StravaRuter og aktiviteterOAuth 2.0 (client credentials i 1Password)

Tilgang til ruter, segmenter og aktivitetsdata for brukere som autentiserer med OAuth 2.0.

Base URL

`https://www.strava.com/api/v3`

Autentisering

OAuth 2.0 (client credentials i 1Password)

Rate limit

200 requests / 15 min, 2 000 / dag.

Kostnad

Gratis. 200 requests per 15 min, 2 000 per dag.

#### Endepunkter


|Path               |Beskrivelse                                 |
|-------------------|--------------------------------------------|
|/athlete           |Hent innlogget brukers profil.              |
|/athlete/activities|Brukerens aktiviteter (turer, løp, sykling).|
|/routes/{id}       |Hent en rute med GeoJSON.                   |
|/segments/explore  |Finn populære segmenter i et område.        |


#### Tips

*   Client ID og client secret ligger i Blanks 1Password. Hent derfra i stedet for å opprette egen Strava-app.
*   OAuth flow: brukeren klikker "Logg inn med Strava", autoriserer og du får access\_token.
*   Access tokens utløper etter 6 timer. Bruk refresh\_token for å fornye.
*   Egnet for "importer dine turer" eller "finn populære ruter i området".
*   Callback domain: sett til localhost under utvikling, endre til prod-domene ved deploy.

Google Maps PlatformKart, geocoding, directions, placesAPI-nøkkel via Blank GCP

Googles kartplattform med geocoding, directions, places og mer. Tilgjengelig via Blanks abonnement.

Autentisering

API-nøkkel via Blank GCP

Rate limit

Ikke dokumentert (per produkt).

Kostnad

Pay-as-you-go. $300 trial credit for nye prosjekter. 10K gratis kall per måned per produkt.

#### Endepunkter


|Path          |Beskrivelse                                  |
|--------------|---------------------------------------------|
|Geocoding API |Konverter adresse til koordinater og motsatt.|
|Places API    |Søk etter steder rundt en posisjon.          |
|Directions API|Bilrute fra A til B.                         |


#### Tips

*   Bruk Maps JavaScript API for interaktivt kart, eller Static Maps for enkle bilder.
*   Places API for "finn nærmeste bensinstasjon" nær turstart.
*   Directions API for bilrute fra brukerens posisjon til turstart, alternativ til Entur for bilister.
*   Vurder om Kartverket pluss Overpass dekker behovet før du bruker Google Maps (spar penger).
*   API-nøkkel hentes fra Blanks Google Cloud-konto.

Claude APIAIx-api-key header

Anthropics Claude API for AI-drevet turplanlegging, anbefalinger og naturlig språk-interaksjon.

Base URL

`https://api.anthropic.com/v1/messages`

Autentisering

x-api-key header

Rate limit

Avhenger av tier.

Kostnad

Sonnet 4.6: $3 per MTok input, $15 per MTok output. Haiku 4.5: $1 per MTok input, $5 per MTok output.

#### Endepunkter


|Path        |Beskrivelse                            |
|------------|---------------------------------------|
|/v1/messages|Chat completions med valgfri streaming.|


#### Tips

*   Bruk Haiku for raske, billige kall (autocomplete, klassifisering). Sonnet for kompleks turplanlegging.
*   System prompt med kontekst om norsk friluftsliv, DNT-gradering og fjellvettreglene.
*   Tool use eller function calling for å la Claude kalle de andre API-ene (vær, ruter, hytter).
*   Streaming for bedre UX. Brukeren ser svaret bygges opp.
*   Hvert team bruker eget Anthropic-abonnement (console.anthropic.com).

DATEX II v3 (Vegvesenet sanntid)Trafikkmeldinger, reisetider, veivær, webkameraerHTTP Basic Auth (credentials i 1Password)

Statens vegvesens DATEX-tjeneste gir sanntids trafikkmeldinger, reisetider, veivær, webkameraer og prognoser. DATEX II v3 er en europeisk standard for utveksling av trafikkdata. XML-respons, store filer (5 til 20 MB).

Base URL

`https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/`

Autentisering

HTTP Basic Auth (credentials i 1Password)

Rate limit

Ikke dokumentert. Bruk pull snapshot, ikke poll oftere enn hvert 60. sekund.

#### Endepunkter



* Path: .../GetSituation/pullsnapshotdata
  * Beskrivelse: Trafikkmeldinger: ulykker, stenginger, veiarbeid, kjøreforhold.
* Path: .../GetTravelTimeData/pullsnapshotdata
  * Beskrivelse: Reisetider i sanntid mellom faste målepunkter.
* Path: .../GetMeasuredWeatherData/pullsnapshotdata
  * Beskrivelse: Veivær: temperatur, sikt, vindstyrke, veibaneforhold.
* Path: .../GetCCTVSiteTable/pullsnapshotdata
  * Beskrivelse: Webkameraer langs veiene. URL-er til bilder.
* Path: .../GetForecastPointData/pullsnapshotdata
  * Beskrivelse: Værprognoser for veistrekninger.
* Path: .../GetPredefinedTravelTimeLocations/pullsnapshotdata
  * Beskrivelse: Definerte strekninger for reisetidsmåling.


#### Eksempler

```
# Hent trafikkmeldinger (Basic Auth)
curl -u "brukernavn:passord" \
  "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetSituation/pullsnapshotdata"
```


```
# Hent reisetider
curl -u "brukernavn:passord" \
  "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetTravelTimeData/pullsnapshotdata"
```


#### Tips

*   Responsene er store XML-filer (5 til 20 MB). Bruk en streaming XML-parser (sax-js for Node, lxml.etree.iterparse for Python).
*   GetSituation er den mest nyttige: stenginger, kolonnekjøring, ulykker og veiarbeid med koordinater.
*   GetMeasuredWeatherData gir veibanetemperatur og sikt, egnet for "er det trygt å kjøre over fjellet?"-funksjonalitet.
*   Kombiner med Yr-data: DATEX gir veivær på veien, Yr gir prognose for turområdet.
*   Webkamera-URLene fra GetCCTVSiteTable kan vises direkte i appen for live view av fjelloverganger.
*   Credentials ligger i 1Password. IKKE hardkod brukernavn eller passord i koden.

Anbefalt kombinasjon
--------------------

En sammensetning som dekker kart, vær, hytter, ruter og transport uten en eneste registrering.

### Kart

*   Kartverket WMTS som bakgrunnskart (norsk turkart med høydekurver og stier).
*   Overpass API for POI-lag (hytter, utsiktspunkter, vannkilder) som overlay.
*   Stedsnavn-API fra Geonorge for søk og autocomplete.

### Vær og sikkerhet

*   Yr LocationForecast for 9-dagers prognose per tursted.
*   Yr NowCast for sanntidsvær under turen (kun Norden).
*   Varsom/NVE for skredvarsel og faredata vist på kartet.

### Hytter og ruter

*   UT.no GraphQL for DNT-hytter (1 999) og merkede ruter (1 395) med koordinater og beskrivelser.
*   iNatur search for kommersielle hytter og utleieobjekter (5 639 tilbud) med bilder og priser.
*   Miljødirektoratet for kartlagte friluftsområder med verdivurdering og egnethet.

### Transport og veier

*   Entur Geocoder for holdeplass-søk.
*   Entur Journey Planner for kollektivruting til turstart.
*   Vegvesen Trafikkdata for trafikkmengde på veien til turstart.
*   NVDB for rasteplasser, kolonnestrekninger og bomstasjoner.
