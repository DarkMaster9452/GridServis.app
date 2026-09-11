# Čo treba spraviť pred spustením — úlohy mimo kódu

Tento súbor je zvyšok kontroly 20 bodov. Všetko, čo sa dalo spraviť v repe,
je už spravené (zoznam je dole v časti *Hotové v kóde*). Tu zostali veci,
ktoré vyžadujú tvoj prístup — DNS, Stripe, Google — alebo tvoje rozhodnutie.

Zoradené podľa toho, čo ťa môže stáť peniaze alebo zákazníka.

---

## 1. DMARC záznam v DNS — e-maily môžu padať do spamu

**Prečo:** DKIM aj SPF máš nastavené, DMARC nie. Gmail a Outlook bez neho
môžu uvítací e-mail s licenčným kódom hodiť do spamu. Je to prvý e-mail,
ktorý platiaci zákazník uvidí.

**Kde:** Vercel → Domains → `gridservis.app` → DNS → Add Record

```
Type:  TXT
Name:  _dmarc
Value: v=DMARC1; p=none; rua=mailto:strananekm@gmail.com
```

`p=none` znamená „nič neblokuj, len mi posielaj hlásenia" — bezpečný začiatok.
Po pár týždňoch, keď z hlásení uvidíš, že všetko prechádza, sa dá pritvrdiť
na `p=quarantine`.

**Overenie po nastavení:**

```
dig +short TXT _dmarc.gridservis.app
```

- [ ] TXT záznam `_dmarc` pridaný
- [ ] `dig` ho vracia
- [ ] Skúšobný e-mail z Resendu dorazil do Gmailu do doručenej pošty, nie do spamu

---

## 2. MX záznamy — len ak chceš `podpora@gridservis.app`

Na hlavnej doméne nie sú žiadne MX záznamy, takže na adresu
`podpora@gridservis.app` sa teraz nedá nič doručiť. Kým používaš
`strananekm@gmail.com`, nič sa nedeje — ale ak chceš vlastnú adresu,
postup je v `server/email/README.md`.

- [ ] Rozhodnuté, či vlastnú adresu chceš
- [ ] Ak áno, MX záznamy doplnené

---

## 3. Stripe v živom režime

**Prečo:** v testovacom režime platba prejde, zákazník dostane kód, ale
peniaze neprídu. Navonok to vyzerá úplne rovnako.

- [ ] Vo Verceli je `STRIPE_SECRET_KEY` živý kľúč (`sk_live_…`, nie `sk_test_…`)
- [ ] Webhook `/api/stripe-hook` je založený v živom režime a má živý `STRIPE_WEBHOOK_SECRET`
- [ ] Ak používaš `STRIPE_PRICE_ROK` / `STRIPE_PRICE_MESIAC`, sú to ceny zo živého účtu
- [ ] V Stripe Dashboarde je vypnutý test mód a vidíš tam skutočnú objednávku

**Ceny som skontroloval a sedia:** `tools/gen.py` má `CENY = {'rok': 199.99,
'mesiac': 19.99}`, `api/_stripe.js` má `suma: 19999` a `suma: 1999`. Keď budeš
cenu meniť, meň ju na oboch miestach naraz.

---

## 4. Preklikať celú platobnú cestu ako cudzí človek

Otestuj to z mobilu, v anonymnom okne, na mobilných dátach — nie z počítača,
kde máš všade prihlásené účty a vyplnené karty.

- [ ] Ročné predplatné → zaškrtnem súhlas → Stripe pokladňa → návrat na `hotovo.html` → ukáže sa licenčný kód
- [ ] Ten istý kód prišiel aj e-mailom
- [ ] Mesačné predplatné to isté
- [ ] **Bez zaškrtnutého súhlasu sa objednávka nezaloží** (nová kontrola, vráti hlášku na cenník)
- [ ] Demo za 0 € → stiahne sa demo inštalačka, nie plná verzia
- [ ] Zrušenie platby v Stripe → vrátim sa na cenník s hláškou o zrušení
- [ ] `client_reference_id` nesie licenčný kód (inak sa v logu objaví `stripe_bez_kodu`)
- [ ] Plná inštalačka sa po zaplatení naozaj stiahne (`/api/stiahnut-plna` som overil, presmeruje na GitHub release)
- [ ] Zadaný licenčný kód program odomkne

---

## 5. Google Search Console

- [ ] Pridaná doména `www.gridservis.app`
- [ ] Overené vlastníctvo (najjednoduchšie TXT záznamom vo Verceli)
- [ ] Odoslaná sitemapa `https://www.gridservis.app/sitemap.xml`
- [ ] O pár dní skontrolované, že stránky sú zaindexované

---

## 6. Monitoring dostupnosti

Zadarmo stačí UptimeRobot. Sleduj dve adresy:

| Adresa | Prečo |
|---|---|
| `https://www.gridservis.app/` | web ako taký |
| `https://www.gridservis.app/api/verzia` | ak spadne, **programy prestanú vidieť aktualizácie** a inak sa to nedozvieš |

- [ ] Monitor na `/` založený
- [ ] Monitor na `/api/verzia` založený
- [ ] Upozornenia chodia na e-mail, ktorý naozaj čítaš

---

## 7. PageSpeed a screenshoty do WebP

Screenshoty sú PNG, najväčší `zakazky.png` má 313 kB. Vo WebP by mali zhruba
tretinu. Povedal si, že screenshoty budú nové — takže:

- [ ] Nové screenshoty nafotené
- [ ] Uložené ako WebP (alebo prevedené), ideálne do šírky 1600 px
- [ ] Nahradené v `assets/img/`, prípadne doplnené `<picture>` s PNG zálohou v `tools/gen.py`
- [ ] Skóre zmerané v PageSpeed Insights **na ostrej doméne**, nie na `*.vercel.app` — výsledky sa líšia

Zvyšok výkonu je zdravý: jeden CSS, jeden JS, žiadne externé písma ani
knižnice, obrázky majú rozmery aj `loading="lazy"`, hero má `fetchpriority="high"`.

---

## 8. Identifikácia predávajúceho — otázka na účtovníka

V `kontakt.html` je uvedené len „fyzická osoba, nie obchodná spoločnosť" a
e-mail. Pri predaji na diaľku zákon žiada aj **meno a priezvisko, adresu
miesta podnikania a IČO**, ak podnikáš na živnosť.

Povedal si, že zatiaľ živnosť nemáš, takže som v kontakte nič nemenil.
Ale pravidelný príjem zo Stripe je pravidelný príjem:

- [ ] Overené s účtovníkom, či pravidelný príjem z predaja programu ide bez živnosti
- [ ] Ak živnosť budeš mať, napíš mi meno, adresu miesta podnikania a IČO — doplním ich do `kontakt.html` aj do bodu 1 obchodných podmienok

Toto je jediný bod z kontroly, ktorý zostal nedoriešený v kóde.

---

## 9. Drobnosti, ktoré sú na zváženie

Nič z toho nie je nutné pred spustením.

- [ ] **Súhlas s odstúpením aj na `obnova.html`** — teraz je len na cenníku. Obnova je predĺženie licencie, ktorú zákazník už má nainštalovanú, takže riziko je menšie. Ak to chceš mať rovnako všade, poviem si a doplním.
- [ ] **`noindex` na `hotovo.html` a `obnova.html`** — obe stránky sa otvárajú z odkazu s parametrami a v hľadaní nemajú čo robiť. V sitemape nie sú, takže Google ich sám hľadať nebude.
- [ ] **CSP hlavička** — web si nesťahuje nič z cudzích domén, takže by sa dala nastaviť prísne. Nechal som ju tak, aby sa pri prvej zmene nič nerozbilo potichu.
- [ ] **Podpisový certifikát inštalačky** — stojí peniaze, ale kým ho nemáš, každý zákazník uvidí SmartScreen. Na webe je to poctivo vysvetlené pred platbou, takže to nie je právny problém, len prekážka pri predaji.

---

## Hotové v kóde — netreba nič

Toto som spravil v tomto repe, stačí nasadiť:

| Bod | Čo sa spravilo | Kde |
|---|---|---|
| 5 | `robots.txt` má riadok so sitemapou a generuje sa spolu so stránkami | `tools/gen.py`, `robots.txt` |
| 6 | `sitemap.xml` vytvorená, generuje sa z jedného zoznamu | `tools/gen.py`, `sitemap.xml` |
| 7 | vlastná stránka 404 vo vizuáli webu, s odkazmi Domov / Cenník / Demo | `404.html` |
| 12 | `og:image` 1200 × 630, `og:url`, `og:site_name`, `twitter:card` | `tools/obrazky.py`, `assets/img/og-gridservis.png` |
| 13b | `/favicon.ico` v koreni | `favicon.ico` |
| 14 | `canonical` na každej stránke, bez parametrov | `tools/gen.py` |
| B | povinný súhlas so stratou práva na odstúpenie pri platbe, kontrolovaný aj na serveri | `tools/gen.py`, `api/checkout.js` |
| C | bezpečnostné hlavičky | `vercel.json` |
| D | JSON-LD so štruktúrovanými dátami a cenou | `tools/gen.py` (cenník) |

Po každej zmene v `tools/gen.py` spusti `python3 tools/gen.py`. HTML sa needituje ručne.
