/* Vydávanie licencií po zaplatení.

   Licenčný kód má rovnaký tvar ako kódy z admin aplikácie (MECH-XXXX-XXXX-XXXX),
   takže sa s nimi mieša v jednej tabuľke a program ho aktivuje bez zmeny.

   Všetko je odolné voči zopakovaniu: kľúčom je stripe_id v tabuľke platby.
   Keď Stripe pošle tú istú udalosť dvakrát (alebo sa kupujúci vráti na stránku
   skôr, než príde webhook), druhýkrát sa už nová licencia nevytvorí. */

var crypto = require('crypto');
var { sql, riadok } = require('./_db');

var ABECEDA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // bez znakov, čo sa pletú
var DNI_NAVYSE = 3;      // odklad, nech program nezamkne skôr, než prejde obnova

function novyKod() {
  var skupiny = [];
  for (var s = 0; s < 3; s++) {
    var z = '';
    for (var i = 0; i < 4; i++) z += ABECEDA[crypto.randomInt(ABECEDA.length)];
    skupiny.push(z);
  }
  return 'MECH-' + skupiny.join('-');
}

async function volnyKod() {
  for (var i = 0; i < 20; i++) {
    var kod = novyKod();
    var obsadeny = await riadok('SELECT 1 FROM licencie WHERE kod = $1', [kod]);
    if (!obsadeny) return kod;
  }
  throw new Error('nepodarilo sa vygenerovať voľný kód');
}

/* dátum, dokedy licencia platí — koniec zaplateného obdobia plus deň odkladu */
function platnaDo(koniecObdobia, plan) {
  var d;
  if (koniecObdobia) {
    d = new Date(Number(koniecObdobia) * 1000);
  } else {
    d = new Date();
    if (plan === 'rok') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
  }
  d.setDate(d.getDate() + DNI_NAVYSE);
  return d.toISOString().slice(0, 10);
}

/* vydá licenciu k zaplatenej objednávke; keď už k nej licencia je, vráti ju */
async function vydaj(platba) {
  var uz = await riadok('SELECT kod FROM platby WHERE stripe_id = $1', [platba.stripe_id]);
  if (uz && uz.kod) {
    var l = await riadok('SELECT platna_do FROM licencie WHERE kod = $1', [uz.kod]);
    /* dátum môže prísť ako text aj ako čas — na stránku patrí len deň */
    return { kod: uz.kod, nova: false, platna_do: String((l && l.platna_do) || '').slice(0, 10) };
  }

  var kod = await volnyKod();
  var dokedy = platnaDo(platba.koniec_obdobia, platba.plan);
  var dielna = platba.meno || platba.email || 'Zákazník z webu';

  await sql(
    `INSERT INTO licencie (kod, dielna, kontakt, max_zariadeni, platna_do, stav, poznamka)
     VALUES ($1, $2, $3, 1, $4::date, 'aktivna', $5)`,
    [kod, dielna, platba.email || '', dokedy,
     'AutoAgenda web · ' + (platba.plan === 'rok' ? 'ročné' : 'mesačné') +
     ' predplatné · ' + platba.stripe_id]
  );

  await zapisPlatbu({ ...platba, kod: kod });
  return { kod: kod, nova: true, platna_do: dokedy };
}

/* zápis platby; opakovaný zápis tej istej udalosti nič nepokazí */
async function zapisPlatbu(platba) {
  await sql(
    `INSERT INTO platby (stripe_id, druh, plan, email, suma, mena, stav,
                         stripe_zakaznik, stripe_predplatne, kod, poznamka)
     VALUES ($1, $2, $3, $4, NULLIF($5, '')::int, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (stripe_id) DO UPDATE
        SET stav = EXCLUDED.stav,
            kod = COALESCE(platby.kod, EXCLUDED.kod),
            email = COALESCE(NULLIF(EXCLUDED.email, ''), platby.email),
            stripe_predplatne = COALESCE(EXCLUDED.stripe_predplatne, platby.stripe_predplatne)`,
    [platba.stripe_id, platba.druh || 'checkout', platba.plan || '', platba.email || '',
     platba.suma === undefined || platba.suma === null ? '' : platba.suma,
     platba.mena || 'eur', platba.stav || 'zaplatena',
     platba.stripe_zakaznik || null, platba.stripe_predplatne || null,
     platba.kod || null, platba.poznamka || null]
  );
}

/* obnova predplatného — predĺži platnosť licencie, ktorá k nemu patrí */
async function predlz(predplatne, koniecObdobia, faktura) {
  var povodna = await riadok(
    `SELECT kod, plan, email, stripe_zakaznik FROM platby
      WHERE stripe_predplatne = $1 AND kod IS NOT NULL
      ORDER BY cas ASC LIMIT 1`, [predplatne]);
  if (!povodna) return null;

  var dokedy = platnaDo(koniecObdobia, povodna.plan);
  await sql(
    `UPDATE licencie
        SET platna_do = GREATEST(platna_do, $2::date), stav = 'aktivna'
      WHERE kod = $1`, [povodna.kod, dokedy]);

  await zapisPlatbu({
    stripe_id: faktura.stripe_id,
    druh: 'obnova',
    plan: povodna.plan,
    email: faktura.email || povodna.email,
    suma: faktura.suma,
    mena: faktura.mena,
    stav: faktura.stav || 'zaplatena',
    stripe_zakaznik: povodna.stripe_zakaznik,
    stripe_predplatne: predplatne,
    kod: povodna.kod
  });

  return { kod: povodna.kod, platna_do: dokedy };
}

/* obnovenie zastavenej licencie — kupujúci zaplatil znova na ten istý kód */
async function obnov(kod, koniecObdobia, platba) {
  var l = await riadok('SELECT kod FROM licencie WHERE kod = $1', [kod]);
  if (!l) return null;

  var dokedy = platnaDo(koniecObdobia, platba.plan);
  await sql(
    `UPDATE licencie
        SET platna_do = GREATEST(COALESCE(platna_do, current_date), $2::date),
            stav = 'aktivna'
      WHERE kod = $1`, [kod, dokedy]);

  await zapisPlatbu({ ...platba, kod: kod, druh: 'obnova' });
  return { kod: kod, platna_do: dokedy };
}


/* poznámka k licencii — zrušenie obnovy, neúspešná platba a podobne */
async function poznamka(predplatne, text) {
  var p = await riadok(
    `SELECT kod FROM platby WHERE stripe_predplatne = $1 AND kod IS NOT NULL
      ORDER BY cas ASC LIMIT 1`, [predplatne]);
  if (!p) return null;
  await sql(
    `UPDATE licencie
        SET poznamka = left(COALESCE(poznamka, '') || ' · ' || $2, 900)
      WHERE kod = $1`, [p.kod, text]);
  return p.kod;
}

module.exports = {
  vydaj: vydaj,
  obnov: obnov,
  predlz: predlz,
  zapisPlatbu: zapisPlatbu,
  poznamka: poznamka,
  platnaDo: platnaDo
};
