# Mechanik — Custom Autoservis Manager

Desktopová aplikácia na správu autoservisu pre Windows + prezentačný web k nej.

## Aplikácia

Inštalačku nájdete v [releases](https://github.com/DarkMaster9452/Custom-Autoservis-manager/releases/latest)
(`MechanikSetup.exe`, Windows 10/11 64-bit).

## Web

Statický web bez build kroku — čisté HTML, CSS a jeden JS súbor.

```
index.html               # celá landing page
assets/css/styles.css    # štýly
assets/js/main.js        # navigácia, reveal animácie, načítanie info o poslednom release
.github/workflows/pages.yml
```

### Lokálne spustenie

```bash
python3 -m http.server 8080
# http://localhost:8080
```

### Nasadenie

- **GitHub Pages** — workflow `.github/workflows/pages.yml` nasadí web pri každom pushi do `main`.
  V *Settings → Pages* stačí nastaviť **Source: GitHub Actions**.
- **Vercel / Netlify** — importovať repo, build command nechať prázdny, output directory `.`.

### Verzia a odkaz na stiahnutie

Číslo verzie, veľkosť a odkaz na `MechanikSetup.exe` sa načítavajú za behu
z GitHub API (`/releases/latest`). Ak API nie je dostupné, použijú sa statické
hodnoty priamo v `index.html`. Po vydaní novej verzie teda netreba web meniť.

### Čo si treba prejsť pred spustením

Texty funkcií a FAQ sú napísané podľa bežného rozsahu autoservis softvéru —
prispôsobte ich reálnym funkciám aplikácie. Rovnako:

- systémové požiadavky v sekcii *Prečo Mechanik*
- odpoveď o viacerých staniciach v FAQ
- doplniť reálne screenshoty namiesto mockupu v hero sekcii
- `canonical` URL v `<head>`, ak web pobeží na vlastnej doméne
