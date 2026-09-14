# Čo treba pozrieť v programe GridServis (Windows appka)

Kontrola 20 bodov bola o webe, takže tu toho veľa nie je. Toto sú veci,
ktoré z tej kontroly vyplynuli **pre program**, nie pre web. Program je
v inom repe, preto to píšem sem ako zoznam, nie ako zmenu v kóde.

Zoradené podľa dôležitosti.

---

## 1. Program nesmie volať `/api/checkout` priamo

**Prečo:** na cenník som pridal povinný checkbox, ktorým kupujúci súhlasí,
že sťahovanie začne hneď po zaplatení a že tým **stráca právo na odstúpenie
do 14 dní** (§ 7 ods. 6 písm. l) zákona č. 102/2014 Z. z.). Bez toho súhlasu
môže zákazník po mesiaci používania pýtať peniaze späť a formálne bude mať
pravdu.

Server ten súhlas odteraz kontroluje: `POST /api/checkout` bez `suhlas=1`
vráti pri platených plánoch presmerovanie s chybou a platbu nezaloží.

**Čo overiť v programe:**

- [ ] Program nikde nevolá `/api/checkout` sám (napríklad tlačidlom „Kúpiť" v Nastaveniach). Ak áno, **prestane to fungovať** — musí namiesto toho otvoriť `https://www.gridservis.app/cennik.html` v prehliadači.
- [ ] To isté pre obrazovku so zastavenou licenciou: otvor `https://www.gridservis.app/obnova.html?kod=<KOD>` v prehliadači, nie vlastné volanie API.
- [ ] Ak by si niekedy chcel platbu priamo v programe, musí tam byť ten istý checkbox a musí posielať `suhlas=1`. Inak je súhlas bezcenný.

---

## 2. Všetky adresy v programe musia mať `www.`

**Prečo:** apex `gridservis.app` presmerováva na `www.gridservis.app` cez
308. Prehliadač to zvládne, ale HTTP klient v programe nemusí — hlavne pri
POST požiadavkách, kde sa presmerovanie nesprávne spracúva pomerne často.

- [ ] Prejsť všetky natvrdo napísané adresy v programe (`gridservis.app` → `www.gridservis.app`)
- [ ] Týka sa hlavne: `/api/verzia`, `/api/portal`, `/api/pristup`, odkazu na `obnova.html`, odkazu na `cennik.html`
- [ ] HTTP klient má nastavené nasledovanie presmerovaní ako poistku

---

## 3. Výpadok `/api/verzia` nesmie zhodiť program

**Prečo:** do úloh na webe som pridal monitoring tohto endpointu práve preto,
že keď spadne, programy prestanú vidieť aktualizácie a nikto sa to nedozvie.
Program to ale nesmie riešiť pádom ani zaseknutím.

- [ ] Kontrola verzie má krátky timeout (3–5 s), nie donekonečna
- [ ] Chyba, prázdna odpoveď aj nezmyselný JSON sa ticho ignorujú — program normálne beží ďalej
- [ ] Kontrola verzie neblokuje spustenie programu (beží na pozadí)
- [ ] Keď kontrola zlyhá, používateľ nevidí strašidelnú hlášku, nanajvýš poznámku v Nastaveniach

---

## 4. Licenčný kód sa musí dať získať aj bez e-mailu

**Prečo:** kým nie je nastavený DMARC (bod 1 v `ULOHY-PRED-SPUSTENIM.md`),
Gmail a Outlook môžu e-mail s kódom hodiť do spamu. Kód sa zobrazí aj na
`hotovo.html` hneď po zaplatení, ale zákazník si ho nemusí opísať.

- [ ] Na aktivačnej obrazovke je viditeľné, čo robiť, keď kód neprišiel (pozrieť spam, napísať na e-mail predávajúceho)
- [ ] Kód sa dá vložiť zo schránky vrátane medzier a malých písmen (program si ho má sám očistiť a zveľkopísmeniť)
- [ ] Po aktivácii si program kód pamätá a vie ho používateľovi znova ukázať v Nastaveniach

---

## 5. Ceny v programe, ak sa niekde zobrazujú

Na webe a v Stripe ceny sedia: ročne **199,99 €**, mesačne **19,99 €**.

- [ ] Ak program niekde píše cenu (obrazovka zastavenej licencie, Nastavenia, O programe), sedí s webom
- [ ] Ešte lepšie: cenu nepíš v programe natvrdo, ale odkáž na cenník — potom sa nemá čo rozísť

---

## 6. Zrušenie obnovy v programe

Toto na webe funguje cez `/api/portal`, ktorý vráti odkaz do Stripe portálu.
V obchodných podmienkach je napísané, že obnovu vypne používateľ „priamo
v programe v Nastaveniach".

- [ ] Také tlačidlo v Nastaveniach naozaj existuje
- [ ] Otvorí Stripe portál v prehliadači a zrušenie tam prejde
- [ ] Ak portál nie je dostupný, program ponúkne e-mail na predávajúceho

---

## Čo v programe riešiť netreba

Aby bolo jasné, kde je hranica: sitemapa, 404, canonical, og:image, favicon,
bezpečnostné hlavičky, JSON-LD a cookies sa týkajú výlučne webu a v repe webu
sú už hotové. Do programu z nich nič nezasahuje.
