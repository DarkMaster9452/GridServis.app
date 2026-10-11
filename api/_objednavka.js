/* Čo sa deje po zaplatení: zápis platby, vydanie licencie, e-mail.

   Volá sa z dvoch miest, ktoré si navzájom nemôžu ublížiť:
     * webhook zo Stripe (príde vždy, aj keď kupujúci zavrie prehliadač),
     * stránka hotovo.html cez /api/pristup (príde hneď, aj keď webhook mešká).
   Kto je prvý, ten licenciu vydá; druhý dostane tú istú. */

var { stripe } = require('./_stripe');
var { vydaj, obnov, zapisPlatbu } = require('./_licencia');
var { riadok, sql } = require('./_db');
var email = require('./_email');

function id(hodnota) {
  if (!hodnota) return '';
  return typeof hodnota === 'string' ? hodnota : String(hodnota.id || '');
}

/* koniec zaplateného obdobia; polohu poľa si Stripe medzi verziami presunul */
function koniecObdobia(predplatne) {
  if (predplatne.current_period_end) return predplatne.current_period_end;
  var polozky = (predplatne.items && predplatne.items.data) || [];
  return polozky.length ? polozky[0].current_period_end : null;
}

/* Spätnú väzbu s ponukou 3 mesiacov zadarmo dostane len prvých pár rôznych
   zákazníkov dema; potom už len bežné privítanie. Vlastné adresy sa
   nepočítajú a e-mail nedostanú. */
var MAX_RECENZII = parseInt(process.env.GRIDSERVIS_RECENZIE_MAX || '5', 10);
var RECENZIA_ZA_DNI = 2;
var VLASTNE_EMAILY = ['strananekm@gmail.com', 'support@gridservis.app']
  .concat(String(process.env.GRIDSERVIS_VLASTNE_EMAILY || '').split(','))
  .map(function (e) { return e.trim().toLowerCase(); })
  .filter(Boolean);

/* poradie zákazníka medzi rôznymi zákazníkmi dema (1 = prvý), alebo null,
   keď ide o vlastnú adresu alebo zákazníka, ktorý už demo mal.
   Volá sa pred zápisom novej objednávky. */
async function poradieDema(adresa) {
  adresa = String(adresa || '').trim().toLowerCase();
  if (!adresa || VLASTNE_EMAILY.indexOf(adresa) !== -1) return null;
  var riadky = await sql(
    "SELECT DISTINCT lower(email) AS email FROM platby WHERE plan = 'demo' AND email <> ''");
  var ini = riadky.map(function (r) { return r.email; })
    .filter(function (e) { return VLASTNE_EMAILY.indexOf(e) === -1; });
  if (ini.indexOf(adresa) !== -1) return null;
  return ini.length + 1;
}

async function spracuj(relacia, adresaWebu) {
  var plan = (relacia.metadata && relacia.metadata.plan) || '';
  var hotova = relacia.status === 'complete' &&
    (relacia.payment_status === 'paid' || relacia.payment_status === 'no_payment_required');
  if (!hotova) return null;

  var udaje = {
    stripe_id: relacia.id,
    druh: 'checkout',
    plan: plan,
    email: (relacia.customer_details && relacia.customer_details.email) || '',
    meno: (relacia.customer_details && relacia.customer_details.name) || '',
    suma: relacia.amount_total,
    mena: relacia.currency || 'eur',
    stripe_zakaznik: id(relacia.customer),
    stripe_predplatne: id(relacia.subscription),
    /* počet počítačov z cenníka; staršie objednávky ho nemajú → 1 */
    pocitace: Math.max(1, parseInt((relacia.metadata && relacia.metadata.pocitace) || '1', 10) || 1)
  };

  /* demo je objednávka za 0 € bez licencie — program má vlastnú demo edíciu */
  if (!udaje.stripe_predplatne) {
    /* e-mail len pri prvom spracovaní — webhook aj stránka môžu prísť viackrát */
    var uzZapisana = await riadok('SELECT 1 AS x FROM platby WHERE stripe_id = $1', [udaje.stripe_id]);
    var poradie = !uzZapisana && plan === 'demo' ? await poradieDema(udaje.email) : null;
    await zapisPlatbu(udaje);
    /* e-maily len k čerstvej objednávke — nie keď Stripe po dňoch
       doručí starú udalosť (napr. po oprave webhooku) */
    var cerstva = !relacia.created || (Date.now() / 1000 - relacia.created) < 2 * 86400;
    if (!uzZapisana && plan === 'demo' && cerstva) {
      await email.posliDemo(udaje.email, adresaWebu, udaje.meno);
      if (poradie && poradie <= MAX_RECENZII) {
        var naplanovana = await email.posliRecenziu(udaje.email, adresaWebu, udaje.meno, RECENZIA_ZA_DNI);
        console.log('demo: zákazník č. ' + poradie + ', spätná väzba ' + (naplanovana ? 'naplánovaná' : 'sa nenaplánovala'));
      }
    }
    return { plan: plan, kod: '', email: udaje.email };
  }

  var predplatne = await stripe('/subscriptions/' + udaje.stripe_predplatne);
  udaje.koniec_obdobia = koniecObdobia(predplatne);

  /* obnova zastavenej licencie: kód už existuje, len sa predĺži platnosť */
  var stary = (relacia.metadata && relacia.metadata.kod) || '';
  if (stary) {
    var obnovena = await obnov(stary, udaje.koniec_obdobia, udaje);
    if (obnovena) {
      return {
        plan: plan, kod: obnovena.kod, platna_do: obnovena.platna_do,
        email: udaje.email, nova: false, obnovena: true
      };
    }
  }

  var vydana = await vydaj(udaje);
  var poslany = false;
  if (vydana.nova) {
    poslany = await email.posli(udaje.email, vydana.kod, plan, vydana.platna_do, adresaWebu, udaje.meno);
  }
  return {
    plan: plan,
    kod: vydana.kod,
    platna_do: vydana.platna_do,
    email: udaje.email,
    nova: vydana.nova,
    poslany: poslany
  };
}

module.exports = { spracuj: spracuj, koniecObdobia: koniecObdobia, poradieDema: poradieDema };
