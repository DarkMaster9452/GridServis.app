-- SKÚŠOBNÁ správa licencie (Môj účet) — jednorazové 6-ciferné kódy na prihlásenie.
--
-- Na jeden e-mail je najviac jeden živý kód. V tabuľke nie je kód samotný,
-- len jeho HMAC odtlačok. Riadok sa zmaže po úspešnom prihlásení, po 5 zlých
-- pokusoch alebo keď prepadne (15 minút) — upratuje to samo api/ucet/[akcia].js.
--
-- Spustiť raz pod vlastníkom databázy (nie pod web_klient).
-- Odstránenie celej skúšky: DROP TABLE ucet_kody;

CREATE TABLE IF NOT EXISTS ucet_kody (
  email      text        PRIMARY KEY,
  kod_hash   text        NOT NULL,
  plati_do   timestamptz NOT NULL,
  pokusy     int         NOT NULL DEFAULT 0,
  vytvorene  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ucet_kody TO web_klient;
