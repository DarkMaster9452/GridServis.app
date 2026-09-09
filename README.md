# GridServis — web

Prezentačný web a predaj predplatného na program GridServis (správa
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
hotovo.html                stránka po platbe: licenčný kód a stiahnutie
obnova.html                obnovenie zastavenej licencie (odkaz z programu)
api/checkout.js            založí predplatné v Stripe a presmeruje na pokladňu
api/obnova.js              nové predplatné na existujúci licenčný kód
api/stripe-hook.js         webhook: obnovy, neúspešné platby, koniec predplatného
api/pristup.js             overí objednávku a vydá licenčný kód
api/portal.js              odkaz do Stripe portálu (zrušenie obnovy z programu)
api/udalost.js             anonymné počítadlo návštevnosti
api/stiahnut.js            presmerovanie na inštalačku, až po objednávke
api/verzia.js              JSON s číslom verzie, veľkosťou a dátumom
api/_release.js            spoločný pomocník k vydaniam
api/_stripe.js             spoločný pomocník k Stripe (plány a ceny)
api/_db.js                 spojenie na licenčnú databázu (Neon)
api/_licencia.js           generovanie a predlžovanie licencií
api/_objednavka.js         čo sa deje po zaplatení
api/_email.js              odoslanie licenčného kódu
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

* `CENY` v `tools/gen.py` — texty na stránkach (po zmene spustiť generátor),
* `PLANY` v `api/_stripe.js` — sumy v centoch, ktoré sa účtujú v Stripe.

## Platby cez Stripe

Sťahovať sa dá až po dokončenej objednávke, a to aj demo. Demo je
objednávka s nulovou sumou: Stripe pri nej nepýta kartu, iba e-mail.

```
tlačidlo na stránke  ->  POST /api/checkout  ->  pokladňa Stripe
       -> hotovo.html?relacia=cs_...  ->  /api/pristup (overenie)
       -> /api/stiahnut?relacia=cs_...  ->  inštalačka
```

`/api/stiahnut` si reláciu overuje priamo v Stripe pri každom stiahnutí,
takže odkaz sa nedá podvrhnúť. Inštalačka je pre demo aj pre platené
predplatné tá istá, plnú verziu odomkne až licenčný kľúč, ktorý posielam
e-mailom.

### Premenné prostredia pre Stripe

| Premenná | Povinná | Význam |
|---|---|---|
| `STRIPE_SECRET_KEY` | áno | tajný kľúč, v sandboxe začína `sk_test_` |
| `STRIPE_PRICE_DEMO` | nie | ID ceny za demo, ak ju chcete spravovať v Stripe |
| `STRIPE_PRICE_MESIAC` | nie | ID ceny mesačného predplatného |
| `STRIPE_PRICE_ROK` | nie | ID ceny ročného predplatného |
| `SITE_URL` | nie | adresa webu pre návrat z pokladne; inak sa berie z požiadavky |
| `STRIPE_WEBHOOK_SECRET` | áno | podpis webhooku, `whsec_...` |
| `STIAHNUT_BEZ_PLATBY` | nie | `1` vypne zámok sťahovania, len na testovanie |
| `DATABASE_URL` | áno | pripojenie do licenčnej databázy rolou `web_klient` |
| `RESEND_API_KEY` | nie | kľúč na odosielanie e-mailov s licenčným kódom |
| `RESEND_FROM` | nie | odosielateľ, napr. `GridServis <licencie@vasa-domena.sk>` |
| `RESEND_REPLY_TO` | nie | adresa na odpoveď, predvolene `strananekm@gmail.com` |
| `RELEASE_ASSET_DEMO` | nie | názov demo inštalačky vo vydaní |
| `GITHUB_API` | nie | iná adresa GitHub API, len na testovanie |

Bez `STRIPE_PRICE_*` sa cena posiela priamo z `PLANY` v `api/_stripe.js`,
takže v Stripe netreba nič zakladať.

### Webhook

V Stripe (**Developers → Webhooks → Add endpoint**) treba pridať adresu
`https://<vas-web>/api/stripe-hook` a zapnúť tieto udalosti:

| Udalosť | Čo spraví |
|---|---|
| `checkout.session.completed` | vydá licenciu a pošle kód e-mailom |
| `invoice.paid` | obnova prešla → predĺži platnosť licencie |
| `invoice.payment_failed` | zapíše neúspešnú platbu a poznámku k licencii |
| `customer.subscription.deleted` | predplatné skončilo → licencia sa zastaví |

Podpisové tajomstvo z tej istej obrazovky (`whsec_...`) patrí do
`STRIPE_WEBHOOK_SECRET`. Bez neho webhook beží tiež, ale prijme aj správu,
ktorá neprišla zo Stripe — nastavte ho.

Aj bez webhooku sa licencia vydá, len neskôr: stránka `hotovo.html` si ju
vypýta cez `/api/pristup` hneď po návrate z pokladne. Obnovy predplatného
však bez webhooku fungovať nebudú.

### Kde kľúč nájsť

1. [dashboard.stripe.com](https://dashboard.stripe.com) → vľavo hore
   prepnúť na **Sandbox** (alebo zapnúť **Test mode**).
2. **Developers → API keys → Secret key** → *Reveal*. Kľúč začína
   `sk_test_`. Publishable key (`pk_test_`) tento web nepotrebuje, platba
   beží celá na serveri.
3. Vo Vercel projekte **Settings → Environment Variables** pridať
   `STRIPE_SECRET_KEY`, hodnotu vložiť a nasadiť znova.

### Daň

Relácia sa zakladá s `automatic_tax[enabled]=false`, pretože predávajúci
daň neúčtuje a ceny na webe sú konečné. Ak máte na účte zapnutý Stripe
Tax, bez tohto vypnutia by Checkout pri každej položke pýtal daňový kód
a reláciu by odmietol.

Keby ste sa niekedy stali platiteľom DPH a chceli daň počítať cez Stripe,
založte si produkty a ceny priamo v Stripe (tam sa nastavuje aj daňový
kód), vyplňte `STRIPE_PRICE_*` a v `api/checkout.js` prepnite
`automatic_tax` na `true`.

Keď sa platba nezaloží, hláška zo Stripe sa vypíše pod oznamom na
stránke a rovnaká ide do logu funkcie (Vercel → projekt → **Logs**,
riadok začína `checkout:`). Podľa nej sa dá zistiť, čo Stripe vadí.

Kľúč nikdy nedávajte do repozitára ani do súborov v `assets/`. Keby sa
niekam dostal, v Stripe ho zrušte tlačidlom *Roll key*.

Testovacia karta v sandboxe: `4242 4242 4242 4242`, ľubovoľný budúci
dátum, ľubovoľné CVC a PSČ. Demo kartu nepýta vôbec.

Po prechode na ostrú prevádzku stačí vymeniť `sk_test_` za `sk_live_`
a v Stripe si zapnúť potvrdenia o platbe e-mailom
(*Settings → Customer emails → Successful payments*).

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

## Licencie, predplatné a databáza

Licenčný systém je spoločný s programom — beží v Neon databáze
`mechanik-licencie`, do ktorej sa hlási aj admin aplikácia. Web do nej
pristupuje rolou `web_klient`, ktorá vidí len licencie, platby, návštevnosť
a zariadenia; k zákazníckym dátam dielní (`zaznamy`) ani k podpisovému
tajomstvu (`tajomstva`) sa nedostane.

Tabuľky, ktoré pridal web:

| Tabuľka | Čo je v nej |
|---|---|
| `platby` | každá platba zo Stripe: prvá aj obnovy, e-mail kupujúceho, suma, stav a vydaný licenčný kód |
| `udalosti_web` | anonymné počítadlo: zobrazenia stránok, kliky na predplatné, dokončené platby |

### Ako to ide za sebou

1. Kupujúci zaplatí v pokladni Stripe (predplatné, nie jednorazová platba).
2. Vytvorí sa licencia v tabuľke `licencie`: kód v tvare `MECH-XXXX-XXXX-XXXX`,
   `max_zariadeni = 1`, `platna_do` na koniec zaplateného obdobia plus tri dni
   odkladu, `kontakt` je e-mail z objednávky.
3. Kód sa ukáže na stránke a odošle e-mailom.
4. Po skončení obdobia Stripe strhne ďalšiu platbu; `invoice.paid` predĺži
   `platna_do` a dielňa si ničoho nevšimne.
5. Keď platba neprejde a predplatné skončí, `platna_do` sa nastaví na dnešok —
   program sa uzamkne, dáta v ňom zostanú a ponúkne odkaz na `obnova.html`.
   Po zaplatení sa predĺži tá istá licencia, nový kód sa nevydáva.

Licencia sa pri aktivácii naviaže na jeden počítač. Preloženie inde rieši
predávajúci ručne v admin aplikácii a podľa obchodných podmienok stojí 10 €.

## Čo treba doplniť pred spustením

1. **Stripe kľúč** — `STRIPE_SECRET_KEY` podľa kapitoly vyššie. Kým nie je
   nastavený, tlačidlá *Predplatiť* aj *Získať demo* sa vrátia späť na
   stránku s oznamom a ponúknu objednávku e-mailom; stiahnuť sa nedá nič.
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
var EMAIL = 'strananekm@gmail.com';   // objednávky a podpora
```

Ceny a plány sú na serveri v `api/_stripe.js`, texty s cenami
v `tools/gen.py`.

## Lokálne spustenie

```bash
python3 tools/gen.py      # po zmene textov alebo cien
python3 -m http.server 8080
# http://localhost:8080
```

## Nasadenie

Vercel, projekt napojený na tento repozitár. Bez build príkazu, výstupný
adresár je koreň. Funkcie v `api/` Vercel rozpozná sám.
