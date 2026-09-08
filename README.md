# Mechanik — web

Prezentačný web a predaj licencie na program Mechanik (správa autoservisu, Windows).

## Štruktúra

```
index.html                 Domov
funkcie.html               Popis obrazoviek programu
cennik.html                Licencia, kalkulačka, postup nákupu
stiahnut.html              Demo, požiadavky, inštalácia
faq.html                   Časté otázky
kontakt.html               Kontakt a údaje predávajúceho
ochrana-sukromia.html      Spracúvanie osobných údajov
cookies.html               Cookies
obchodne-podmienky.html    VOP, odstúpenie, reklamácie
assets/css/styles.css
assets/js/main.js
assets/img/                snímky obrazovky programu
api/verzia.js              JSON s číslom verzie, veľkosťou a dátumom
api/stiahnut.js            presmerovanie na inštalačku
api/_release.js            spoločný pomocník k obom
```

Statické stránky bez build kroku a bez externých zdrojov. Web si nesťahuje
nič z cudzích domén: žiadne externé písma, analytika, ani vložený obsah.

## Sťahovanie inštalačky

Odkaz `Stiahnuť demo` mieri na `/api/stiahnut`. Funkcia si na serveri zistí
posledné vydanie a presmeruje na jeho inštalačku, takže na webe nie je
natvrdo zapísaná žiadna verzia ani adresa zdroja. `/api/verzia` doplní na
stránke číslo verzie, veľkosť súboru a dátum vydania; kým neodpovie, platia
hodnoty zapísané priamo v HTML.

Premenné prostredia vo Vercel projekte:

| Premenná | Význam |
|---|---|
| `RELEASE_REPO` | `vlastnik/repozitar` so zdrojom vydaní |
| `RELEASE_ASSET` | názov inštalačky, predvolene `MechanikSetup.exe` |
| `RELEASE_TOKEN` | prístupový token; pri súkromnom repozitári povinný |

S nastaveným tokenom sa presmeruje na podpísanú adresu, ktorú vráti server,
takže sa v prehliadači neobjaví adresa repozitára. Bez tokenu funguje len
verejný repozitár a v adrese sťahovania bude vidieť.

Lokálne `/api/*` nebeží pod `python3 -m http.server`; stránky sa v tom
prípade zobrazia s hodnotami z HTML a odkaz na stiahnutie nefunguje.

## Čo treba doplniť pred spustením

1. **Údaje predávajúceho** — v `gen.py` v premennej `FIRMA`, respektíve
   priamo v HTML: obchodné meno, sídlo, IČO, DIČ, IČ DPH a zápis v registri.
   Kým sú tam hranaté zátvorky, web nespĺňa informačné povinnosti.
2. **Platobná brána** — konštanta `PLATBA` na začiatku `assets/js/main.js`.
   Kým je prázdna, tlačidlá *Kúpiť licenciu* vedú do cenníka a na objednávku
   e-mailom.
3. **Právne texty** — obchodné podmienky, ochrana súkromia a cookies sú
   pripravený návrh podľa slovenskej a európskej úpravy. Pred spustením ich
   nechajte skontrolovať právnikovi.

## Nastavenia na jednom mieste

Na začiatku `assets/js/main.js`:

```js
var EMAIL  = 'strananek@gmail.com';  // objednávky a podpora
var PLATBA = '';                     // adresa platobnej brány
var PASMA  = [ ... ];                // cenové pásma licencie
var MAX    = 10;                     // nad tento počet je cena dohodou
```

Cenové pásma treba zmeniť aj v tabuľke v `obchodne-podmienky.html`
a `cennik.html`, aby sedeli s hodnotami v skripte.

## Lokálne spustenie

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## Nasadenie

Vercel, projekt napojený na tento repozitár. Bez build príkazu, výstupný
adresár je koreň. Funkcie v `api/` Vercel rozpozná sám.
