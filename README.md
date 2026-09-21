# GridServis — web

Prezentačný web pre program GridServis (správa autoservisu, Windows) —
popis programu, cenník, stiahnutie a predaj predplatného.

## Technológie

Statické stránky (HTML, CSS, vanilla JS) bez build kroku, nasadené na
Vercel. Serverová časť (`api/`) rieši platby cez Stripe, vydávanie
licenčných kódov a stiahnutie inštalačky až po objednávke. Stránky sa
generujú z jedného zdroja textov, takže ceny a texty sedia na celom webe.

Web nesťahuje nič z cudzích domén — žiadne externé písma, analytika ani
vložený obsah.

## Lokálny vývoj

```bash
python3 tools/gen.py      # vygeneruje HTML zo šablón
python3 -m http.server 8080
# http://localhost:8080
```

Bez `python3 -m http.server` nebeží `/api/*`, takže sa stránky zobrazia
bez čísla verzie a stiahnutie nebude funkčné — na to treba lokálne
Vercel prostredie alebo nasadené preview.

## Nasadenie

Vercel, napojený priamo na tento repozitár. Bez build príkazu, výstupný
adresár je koreň; funkcie v `api/` Vercel rozpozná sám.

## Kontakt

strananekm@gmail.com
