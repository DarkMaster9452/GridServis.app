# AutoAgenda — web

Prezentačný web a predaj predplatného na program AutoAgenda (správa
autoservisu, Windows).

## Štruktúra

```
index.html                 Domov
funkcie.html               Popis obrazoviek programu
cennik.html                Predplatné, upozornenie pred platbou, postup
stiahnut.html              Demo, požiadavky, inštalácia
faq.html                   Časté otázky
kontakt.html               Kontakt na predávajúceho
ochrana-sukromia.html      Spracúvanie osobných údajov
cookies.html               Cookies
obchodne-podmienky.html    VOP, trvanie predplatného, odstúpenie, reklamácie
assets/css/styles.css
assets/js/main.js
assets/img/favicon.svg     ikona do záložky prehliadača
assets/img/logo.svg        značka (štít s autom a kľúčom)
assets/img/                snímky obrazovky programu
api/verzia.js              JSON s číslom verzie, veľkosťou a dátumom
api/stiahnut.js            presmerovanie na inštalačku
api/_release.js            spoločný pomocník k obom
tools/gen.py               generátor HTML stránok
```

HTML sa needituje ručne. Všetky stránky vygeneruje `python3 tools/gen.py`
zo šablón a textov v tomto súbore; ceny, značka aj údaje predávajúceho sú
tam na jednom mieste.

Statické stránky bez build kroku a bez externých zdrojov. Web si nesťahuje
nič z cudzích domén: žiadne externé písma, analytika, ani vložený obsah.

## Ceny

Predplatné na jeden počítač:

| Obdobie | Cena | Poznámka |
|---|---|---|
| rok | 199,99 € | o 39,89 € lacnejšie ako dvanásť mesačných platieb |
| mesiac | 19,99 € | bez viazanosti |

Ceny sú na dvoch miestach a musia sedieť:

* `CENY` v `tools/gen.py` — texty na stránkach,
* `CENY` v `assets/js/main.js` — sumy v predvyplnenom objednávkovom e-maile.

Po zmene treba spustiť generátor.

## Verzia programu

Číslo verzie nie je nikde zapísané v HTML. Dopĺňa ho `/api/verzia`, ktorý si
na serveri vypýta posledné vydanie (release) na GitHube, takže na webe je
vždy aktuálna verzia. Kým endpoint neodpovie, na stránke ostane len text
„posledná vydaná verzia“ a nič zavádzajúce sa nezobrazí.

Premenné prostredia vo Vercel projekte:

| Premenná | Význam |
|---|---|
| `RELEASE_REPO` | `vlastnik/repozitar` so zdrojom vydaní |
| `RELEASE_ASSET` | názov inštalačky; bez neho sa vezme prvý súbor `.exe` vo vydaní |
| `RELEASE_TOKEN` | prístupový token; pri súkromnom repozitári povinný |

S nastaveným tokenom sa presmeruje na podpísanú adresu, ktorú vráti server,
takže sa v prehliadači neobjaví adresa repozitára. Bez tokenu funguje len
verejný repozitár a v adrese sťahovania bude vidieť.

Lokálne `/api/*` nebeží pod `python3 -m http.server`; stránky sa v tom
prípade zobrazia bez čísla verzie a odkaz na stiahnutie nefunguje.

## Čo treba doplniť pred spustením

1. **Platobná brána** — `PLATBA.rok` a `PLATBA.mesiac` v `assets/js/main.js`.
   Kým sú prázdne, tlačidlá *Predplatiť* v cenníku vedú na objednávku
   e-mailom s predvyplnenou správou.
2. **Údaje predávajúceho** — web uvádza len e-mail, pretože program predáva
   fyzická osoba bez firmy. Ak by pri predaji vznikla povinnosť uvádzať
   identifikačné údaje (napríklad pri živnosti), doplňte ich do `PREDAJCA`
   a `PREDAVAJUCI` v `tools/gen.py`.
3. **Právne texty** — obchodné podmienky, ochrana súkromia a cookies sú
   pripravený návrh podľa slovenskej a európskej úpravy. Pred spustením ich
   nechajte skontrolovať právnikovi.

## Upozornenie na nepodpísanú inštalačku

Inštalačka nemá podpisový certifikát, takže Windows pri jej spustení hlási
neznámeho vydavateľa. Web to hovorí ešte pred platbou: v cenníku v bloku
`#upozornenie`, na stránke s demom, v FAQ aj v bode 7 obchodných podmienok.
Ak certifikát pribudne, tieto štyri miesta treba upraviť v `tools/gen.py`.

## Nastavenia na jednom mieste

Na začiatku `assets/js/main.js`:

```js
var EMAIL  = 'strananekm@gmail.com';   // objednávky a podpora
var PLATBA = { rok: '', mesiac: '' };  // adresy platobnej brány
var CENY   = { rok: 199.99, mesiac: 19.99 };
```

## Lokálne spustenie

```bash
python3 tools/gen.py      # po zmene textov alebo cien
python3 -m http.server 8080
# http://localhost:8080
```

## Nasadenie

Vercel, projekt napojený na tento repozitár. Bez build príkazu, výstupný
adresár je koreň. Funkcie v `api/` Vercel rozpozná sám.
