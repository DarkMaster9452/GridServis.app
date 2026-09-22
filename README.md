<div align="center">

<img src="public/assets/img/og-gridservis.png" alt="GridServis — celý servis v jednom programe" width="720">

# GridServis

**Od príjmu auta po faktúru.**
Program na správu autoservisu pre Windows — a web, ktorý ho predáva.

[www.gridservis.app](https://www.gridservis.app)

</div>

---

## Načo to je

Malé a stredné autoservisy vedú zákazky v zošite, v Exceli alebo v esemeskách.
Keď sa po pol roku vráti to isté auto, nikto nevie, čo sa na ňom naposledy robilo.
Na konci mesiaca sa tržby dopočítavajú ručne.

**GridServis** to celé drží na jednom mieste: zákazka obsahuje zákazníka, auto,
popis závady, vykonané úkony z cenníka prác, vymenené diely zo skladu, fotky aj
cenu. Z tej istej zákazky sa vytlačí zákazkový list, faktúra aj štítok na kľúče.

Program beží lokálne na počítači v dielni — **dáta zostávajú u dielne**, nie
v cudzom cloude.

Tento repozitár obsahuje **web** (prezentácia, cenník, predaj predplatného
a stiahnutie inštalačky). Samotný program pre Windows je vyvíjaný samostatne;
web ho len predáva a servíruje jeho vydania.

---

## Program (Windows aplikácia)

Sedem obrazoviek, ktoré pokrývajú bežný deň v dielni.

### Prehľad

Čísla za rok, rozrobené zákazky a posledný pohyb hneď po otvorení.

![Prehľad](public/assets/img/prehlad.png)

### Zákazky

Zoznam s filtrami podľa stavu (prijaté, v riešení, čaká na diely, hotové, vydané),
vyhľadávanie podľa mena, značky, ŠPZ aj čísla zákazky, export do CSV.
Číslovanie je automatické v tvare `Z2026-0001`.

![Zákazky](public/assets/img/zakazky.png)

### Detail zákazky — práce a cena

Úkony sa ťahajú z cenníka prác aj s normohodinami, diely zo skladu. Cena práce sa
dopočíta zo sadzby dielne. Dole sú tlačidlá na zákazkový list, faktúru a štítok
na kľúče v PDF.

![Detail zákazky](public/assets/img/zakazka-prace.png)

### Sklad

Diely s katalógovým číslom, umiestnením v regáli, nákupnou a predajnou cenou
aj maržou. Program upozorní, čo je pod minimom.

![Sklad](public/assets/img/sklad.png)

### Štatistiky

Tržby po mesiacoch, pomer práce a dielov, neuhradené, rozdelenie zákaziek podľa
stavu, najčastejšie značky vozidiel aj najhodnotnejší zákazníci.

![Štatistiky](public/assets/img/statistiky.png)

Okrem toho sú v programe **Zákazníci** (karty s autami, počtom zákaziek a útratou),
**Cenník prác** (úkony v kategóriách s normohodinami) a **Nastavenia** (údaje
dielne do hlavičky dokladov, hodinová sadzba, IBAN, splatnosť, DPH, číslovanie).

---

## Web

Statický web v slovenčine: popis programu, cenník, FAQ, návod na inštaláciu
a nákup predplatného cez Stripe.

| Domov | Cenník |
| --- | --- |
| ![Domovská stránka](docs/web-domov.png) | ![Cenník](docs/web-cennik.png) |

Web nesťahuje **nič z cudzích domén** — žiadne externé písma, analytika ani
vložený obsah. Návštevnosť sa meria vlastným endpointom `/api/udalost`, ktorý
ukladá len typ udalosti a stránku: žiadne cookies, žiadna IP adresa.

### Čo sa deje na pozadí

Tlačidlo v cenníku otvorí pokladňu Stripe. Po zaplatení dostane zákazník
licenčný kód — zobrazí sa mu hneď na stránke a príde aj e-mailom — a sprístupní
sa mu stiahnutie plnej inštalačky. Demo je tiež objednávka, len za 0 €, takže
Stripe pri nej nepýta kartu, iba e-mail.

Program v dielni si sám zisťuje, či nevyšla nová verzia, a vie otvoriť Stripe
portál na zrušenie obnovy. Keď predplatné skončí alebo platba neprejde, licencia
sa zastaví a program ponúkne odkaz na jej obnovenie — dáta zostávajú na počítači
dielne a po zaplatení sa pokračuje tam, kde sa skončilo.

Licencia platí na jeden počítač. Presun na iný sa rieši cez `presun.html`.

---

## Štruktúra repozitára

```
.
├── public/            samotný web — to, čo Vercel servíruje
│   ├── *.html         stránky (generované z tools/gen.py)
│   ├── assets/        css, js, obrázky a snímky programu
│   ├── favicon.ico
│   ├── robots.txt
│   └── sitemap.xml
├── api/               serverless funkcie (Vercel ich hľadá v koreni)
├── tools/             generátor stránok a obrázkov, nenasadzuje sa
├── docs/              poznámky k projektu a snímky do tohto README
├── .github/workflows/ zápis nového vydania do databázy po GitHub Release
└── vercel.json        bezpečnostné hlavičky a výstupný adresár
```

Stránky sa **negenerujú pri nasadení** — sú v repe hotové. Generátor
`tools/gen.py` je jediný zdroj textov, cien a navigácie, takže sa čísla na webe
nemajú ako rozísť. Po zmene v generátore sa výsledné HTML commitne spolu s ním.

---

## Lokálny vývoj

```bash
python3 tools/gen.py                  # vygeneruje HTML do public/
cd public && python3 -m http.server 8080
# http://localhost:8080
```

Takto nebežia `/api/*`, takže sa stránky zobrazia bez čísla verzie a stiahnutie
nebude funkčné. Na plnú funkčnosť treba `vercel dev` alebo nasadené preview.

Obrázky, ktoré sa nedajú poskladať v HTML (náhľad do sociálnych sietí a
`favicon.ico`), generuje `tools/obrazky.py`. Spúšťa sa ručne, len keď sa mení
značka:

```bash
pip install pillow
python3 tools/obrazky.py
```

---

## Nasadenie

Vercel, napojený priamo na tento repozitár. Bez build kroku — výstupný adresár je
`public/`, funkcie v `api/` si Vercel nájde sám.

Funkcie potrebujú nastavené premenné prostredia pre Stripe, licenčnú databázu
(Neon) a odosielanie e-mailov. Sú vo Vercel projekte, nie v repe — konkrétne
názvy vidno priamo v `api/`.

Odosielanie e-mailov nikdy nesmie zhodiť vydanie licencie: keď sa e-mail poslať
nedá, kód zostáva zobrazený na stránke po platbe a licencia sa vydá tak či tak.

---

## Vydanie novej verzie programu

1. Na GitHube sprav **Release** s tagom `v2.2.6` a s `GridServisSetup.exe` ako asset.
2. Workflow [`vydaj-verziu.yml`](.github/workflows/vydaj-verziu.yml) spočíta SHA‑256
   a veľkosť a zapíše riadok do tabuľky `verzie`.
3. Verzia sa zapíše ako **neaktívna** — dielňam sa zatiaľ neponúka. Zapneš ju
   v admine, alebo dáš do popisu releasu `[zapnut]`.
4. `[povinna]` v popise znamená, že aktualizáciu nepôjde v programe preskočiť.

---

## Poznámky k projektu

- [`docs/ulohy-pred-spustenim.md`](docs/ulohy-pred-spustenim.md) — čo doriešiť na webe
- [`docs/aplikacia-ulohy.md`](docs/aplikacia-ulohy.md) — čo z toho vyplýva pre program

---

## Kontakt

strananekm@gmail.com
