-- Môj účet (ucet.html, api/ucet/[akcia].js) — tabuľky webu.
-- Spustiť raz pod vlastníkom databázy (nie pod web_klient).
-- Odstránenie: DROP TABLE ucet_kody, ucet_prepojenia, odstupenia;

-- Jednorazové 6-ciferné kódy na prihlásenie. Na e-mail najviac jeden živý kód,
-- v tabuľke je len jeho HMAC odtlačok. Riadok sa zmaže po prihlásení, po 5 zlých
-- pokusoch alebo po 15 minútach.
CREATE TABLE IF NOT EXISTS ucet_kody (
  email      text        PRIMARY KEY,
  kod_hash   text        NOT NULL,
  plati_do   timestamptz NOT NULL,
  pokusy     int         NOT NULL DEFAULT 0,
  vytvorene  timestamptz NOT NULL DEFAULT now()
);

-- Prepojenie účtu s Google. Jeden Google účet na jeden účet GridServis a naopak.
CREATE TABLE IF NOT EXISTS ucet_prepojenia (
  ucet_email          text        NOT NULL,
  poskytovatel        text        NOT NULL,
  sub                 text        NOT NULL,
  email_poskytovatela text        NOT NULL DEFAULT '',
  vytvorene           timestamptz NOT NULL DEFAULT now(),
  naposledy           timestamptz,
  PRIMARY KEY (ucet_email, poskytovatel),
  UNIQUE (poskytovatel, sub)
);

-- Odstúpenia od zmluvy cez funkciu na webe (§ 20a zákona č. 108/2024 Z. z.).
CREATE TABLE IF NOT EXISTS odstupenia (
  id        bigserial   PRIMARY KEY,
  cas       timestamptz NOT NULL DEFAULT now(),
  meno      text        NOT NULL,
  email     text        NOT NULL,
  zmluva    text        NOT NULL,
  poznamka  text        NOT NULL DEFAULT ''
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ucet_kody, ucet_prepojenia TO web_klient;
GRANT SELECT, INSERT ON odstupenia TO web_klient;
GRANT USAGE ON SEQUENCE odstupenia_id_seq TO web_klient;
