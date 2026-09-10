/* Čo sa deje po zaplatení: zápis platby, vydanie licencie, e-mail.

   Volá sa z dvoch miest, ktoré si navzájom nemôžu ublížiť:
     * webhook zo Stripe (príde vždy, aj keď kupujúci zavrie prehliadač),
     * stránka hotovo.html cez /api/pristup (príde hneď, aj keď webhook mešká).
   Kto je prvý, ten licenciu vydá; druhý dostane tú istú. */

var { stripe } = require('./_stripe');
var { vydaj, obnov, zapisPlatbu } = require('./_licencia');
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
    stripe_predplatne: id(relacia.subscription)
  };

  /* demo je objednávka za 0 € bez licencie — program má vlastnú demo edíciu */
  if (!udaje.stripe_predplatne) {
    await zapisPlatbu(udaje);
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

module.exports = { spracuj: spracuj, koniecObdobia: koniecObdobia };
