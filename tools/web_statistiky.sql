-- Rozšírené štatistiky webu + vylúčenie vlastných návštev.
-- Spustiť raz pod vlastníkom databázy (nie pod web_klient). Bezpečné spustiť opakovane.

-- 1) nové stĺpce v udalosti_web (staré riadky ostávajú, len majú NULL)
ALTER TABLE udalosti_web
  ADD COLUMN IF NOT EXISTS ciel       text,      -- na čo sa kliklo (text tlačidla / odkaz)
  ADD COLUMN IF NOT EXISTS sekcia     text,      -- v ktorej časti stránky
  ADD COLUMN IF NOT EXISTS x_pct      smallint,  -- kde na stránke (0-100 % šírky)
  ADD COLUMN IF NOT EXISTS y_pct      smallint,  -- kde na stránke (0-100 % výšky)
  ADD COLUMN IF NOT EXISTS hodnota    integer,   -- hĺbka scrollu v %, čas na stránke v s
  ADD COLUMN IF NOT EXISTS zariadenie text,      -- mobil / tablet / pocitac
  ADD COLUMN IF NOT EXISTS prehliadac text,      -- Chrome, Firefox, Safari, Edge...
  ADD COLUMN IF NOT EXISTS system     text,      -- Windows, Android, iOS...
  ADD COLUMN IF NOT EXISTS jazyk      text,      -- sk, cs, en...
  ADD COLUMN IF NOT EXISTS sirka      integer,   -- šírka okna v px
  ADD COLUMN IF NOT EXISTS bot        boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS udalosti_web_relacia_idx ON udalosti_web (relacia, cas);

-- 2) adresy, ktoré web nepočíta (tvoje vlastné). Návštevníkom sa IP nikdy neukladá.
CREATE TABLE IF NOT EXISTS web_vylucene (
  ip       text PRIMARY KEY,
  popis    text,
  pridane  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON web_vylucene TO web_klient;
