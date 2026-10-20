# Prompt: ECoS Driver – moderne, cleane iPad-app in Apple-stijl

Bouw een iPad-app (React Native / Expo, TypeScript) waarmee ik mijn modelbaan bestuur via een ESU ECoS 50200/50210. Kijk naar de app **ECoS CAB** als referentie voor de indeling, maar maak hem duidelijk mooier, rustiger en meer "Apple": hij moet aanvoelen als een app van Apple zelf, bijvoorbeeld zoals Woning, Instellingen of Bestanden op de iPad.

## Ontwerp

**Stijl**
- Volg de Apple Human Interface Guidelines.
- Gebruik een rustige, cleane interface met veel witruimte en geen drukke verlopen of glans.
- De app moet een donkere modus (standaard) en een lichte modus hebben, die automatisch het systeem volgen.

**Kleur**
- Neutrale systeemgrijzen als basis.
- Precies één accentkleur, bijvoorbeeld systeemblauw of een warm amber, die alleen gebruikt wordt voor wat actief is: een functie die aan staat of de huidige snelheid.
- Rood is alleen voor de noodstop. Groen is alleen voor "verbonden" en GO.

**Vlakken**
- Een zijbalk en een kopbalk van matglas (blur/vibrancy).
- Kaarten met afgeronde hoeken van 14–20 pt en een subtiele rand of zachte schaduw, geen zware randen.

**Typografie en iconen**
- San Francisco (systeemlettertype). De hiërarchie bestaat uit Large Title, Title 2, Headline, Body en Footnote.
- Gebruik tabelcijfers voor snelheden en adressen.
- Iconen in de stijl van SF Symbols, met lijnen van gelijke dikte.

**Bediening**
- Elke aanraakzone is minimaal 44 pt.
- Haptische feedback bij schakelen.
- Vloeiende veer-animaties, maar kort (150–250 ms).
- Respecteer de instelling Verminder beweging.

**Indeling**
- Een splitweergave zoals NavigationSplitView: een inklapbare zijbalk links en de inhoud rechts.
- De app moet liggend en staand werken. Liggend is de zijbalk altijd zichtbaar.

## Navigatie (zijbalk)

1. **Centrales**: profielen voor meerdere ECoS-centrales.
   - Per profiel: naam, IP-adres, poort (15471), status online/offline, model en firmware.
   - Een profiel toevoegen of bewerken.
   - Eén profiel is actief.
2. **Overzicht**: een dashboard.
   - Bovenaan tellers in kleine kaarten: locs, wissels, seinen, rijwegen, rijdende locs.
   - Een kaart met de baanstatus GO/STOP.
   - Recent bestuurde locs.
3. **Rijden**: een rijregelaar voor één loc.
4. **Duo**: twee rijregelaars naast elkaar.
5. **Multi**: tien compacte rijregelaars in 2 rijen van 5.
6. **ECoS-scherm**: het scherm van de ECoS.
   - Gebruik een VNC-weergave van het echte ECoS-scherm als de ECoS dat aanbiedt (ECoS CAB heeft hiervoor een VNC-functie; controleer welke poort de ECoS gebruikt).
   - Anders een nagebouwd ECoS-paneel met twee eindeloze draaiwielen, STOP/GO en loc- en wisselbediening.
7. **Bibliotheek**: tabbladen Locomotieven, Wissels en seinen, Terugmelders, Boosters.
8. **Instellingen**.

**Altijd zichtbaar**, bovenaan of in de zijbalk:
- De verbindingsstatus: een bolletje met de naam van de centrale.
- De STOP-knop voor de hele baan. Na een stop wordt die knop GO.

## Bibliotheek (zoals ECoS CAB, maar mooier)

**Lijstweergave**
- Een rustige tabel/lijst in de stijl van Apple Bestanden in lijstweergave.
- Kolommen: foto, naam, adres, protocol, soort.
- Een zoekveld, filterchips en sorteren per kolom.
- Liggend als tabel, staand als lijst met grote rijen.

**Locomotieven**
- Toevoegen, bewerken en verwijderen op de ECoS: naam, adres, protocol.
- Extra gegevens die de app zelf bewaart: foto, omschrijving, soort, topsnelheid in km/h, favoriet.
- Per functie F0–F31: een naam, een icoon, en of hij alleen werkt zolang je drukt.
- Bewerken gebeurt in een sheet (formulier van Apple) met groepen.
- Verwijderen vraagt eerst om bevestiging.

**Wissels, seinen en rijwegen**
- Een lijst met de stand, waarbij je met één tik schakelt.

## Rijregelaar

- **Draaiwiel voor de snelheid**
  - Groot en eindeloos, zoals in ECoS Cab: met de klok mee is sneller.
  - Na een zwiep draait het even door. Aanraken, stop of rem houdt dat meteen tegen.
  - Een tikje als haptische feedback per paar stappen.
  - Rondom een dunne boog in de accentkleur die de snelheid toont.
- **Snelheid**: groot in km/h, berekend uit de topsnelheid van de loc, met de rijstap klein eronder.
- **Rijrichting**: een gesegmenteerde knop Vooruit / Neutraal / Achteruit.
- **Rem**: een schuif die de loc geleidelijk laat afremmen.
- **Noodstop per loc.**
- **Functies F0–F31**
  - Drukknoppen met een icoon, F-nummer en naam, in een raster.
  - Een functie die aan staat krijgt de accentkleur.
  - Een functie die alleen werkt zolang je drukt, krijgt een klein symbool.
- **Loc wisselen**: via een sheet met zoekveld en foto's.

## Techniek (bestaat al in deze repo: hergebruiken)

- ECoS-netwerkprotocol via TCP 15471 in `src/ecos/`: parser, client, simulator en tests.
- Snelheid 0–127, waarbij 1 een noodstop is.
- `request(id, view)` voor live-updates.
- `request(id, control, force)` voordat je bestuurt.
- Locs maken, wijzigen en verwijderen via objectmanager 10.
- Wissels via manager 11.
- Demo-modus met de ingebouwde ECoS-simulator, zodat alles zonder centrale te proberen is.
- Automatisch opnieuw verbinden.
- Het scherm aan houden tijdens het rijden.
- Toestemming voor het lokale netwerk (NSLocalNetworkUsageDescription).
- Gratis installeren: een onondertekende .ipa via Codemagic of GitHub Actions, die ik met Sideloadly installeer.

## Opleveren

- Alle schermen hierboven, werkend in de demo-modus en met een echte ECoS.
- Schermafbeeldingen van elk scherm in donker en licht, staand en liggend, ter controle.
- Geen nepgegevens als "live" tonen. Stroom, spanning en temperatuur geeft de ECoS niet door; toon die dus niet.
