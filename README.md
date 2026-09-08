# Mechanik — Custom Autoservis Manager

Program na správu autoservisu pre Windows a prezentačný web k nemu.

## Program

Inštalačku nájdete medzi [vydaniami](https://github.com/DarkMaster9452/Custom-Autoservis-manager/releases/latest)
(`MechanikSetup.exe`, Windows 10 a 11, 64-bit).

## Web

Statické stránky, žiadny build krok, žiadne závislosti.

```
index.html       Domov
funkcie.html     Popis obrazoviek programu
cennik.html      Jednorazová licencia a kalkulačka podľa počtu PC
stiahnut.html    Inštalačka, požiadavky, postup inštalácie
faq.html         Časté otázky
kontakt.html     Kontakt a objednávka
assets/css/styles.css
assets/js/main.js
assets/img/      snímky obrazovky programu
```

### Lokálne spustenie

```bash
python3 -m http.server 8080
# http://localhost:8080
```

### Čo sa mení kde

Na začiatku `assets/js/main.js` sú dve konštanty:

```js
var EMAIL = 'licencia@mechanik.sk';   // kontaktný e-mail na objednávky a podporu
var PASMA = [ ... ];                  // cenové pásma licencie
```

`EMAIL` sa doplní do všetkých odkazov na písanie e-mailu vrátane
predvyplnenej objednávky z kalkulačky. `PASMA` riadi kalkulačku v
`cennik.html`; tabuľku pásiem pod kalkulačkou treba upraviť aj v HTML,
aby sedela s hodnotami v skripte.

Verzia programu, veľkosť inštalačky a odkaz na stiahnutie sa načítajú
za behu z GitHub API (`/releases/latest`). Ak je API nedostupné, použijú
sa hodnoty zapísané priamo v HTML. Po vydaní novej verzie teda na webe
netreba nič meniť.

### Nasadenie

Vercel, projekt napojený na tento repozitár. Bez build príkazu, výstupný
adresár je koreň repozitára. Každý push do produkčnej vetvy nasadí web.
