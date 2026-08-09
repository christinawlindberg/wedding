// Bilingual support (English / Danish).
//
// English is the authoritative copy and lives directly in the HTML. Danish
// translations live here, keyed by the `data-i18n` attribute on each
// element (for text) or `data-i18n-ph` / `data-i18n-al` (for the
// placeholder / aria-label attributes). The engine caches the original
// English on first load, so switching back and forth is lossless.
//
// For strings that only exist in JavaScript (the RSVP form's dynamic
// messages), add them to BOTH I18N_EN and I18N_DA and read them with
// i18n.t("key"). Proper nouns, addresses, links, and the quote are left in
// their original form on purpose, so they simply have no entry here.
//
// NOTE: the Danish below is a first-pass draft for the couple (native
// speakers) to proofread — the English is authoritative.

window.I18N_DA = {
  // ---- nav (shared across every page) ----
  "nav.home": "Hjem",
  "nav.schedule": "Program",
  "nav.about": "Info",
  "nav.travel": "Rejse",
  "nav.explore": "Oplev",
  "nav.rsvp": "RSVP",

  // ---- home ----
  "home.kicker": "Brylluppet mellem",
  "home.date": "4. september 2027 &middot; Snogeb&aelig;k, Bornholm",
  "home.story": "John og Christina m&oslash;dte hinanden i 2019 p&aring; Johns Hopkins i Baltimore. De var begge indskrevet p&aring; Johns Hopkins&rsquo; ph.d.-program i astronomi og astrofysik. Gennem forel&aelig;sninger, f&aelig;lles l&aelig;segrupper og ugentlige fredagsbarer blev de f&oslash;rst venner og forelskede sig derefter hurtigt i hinanden. P&aring; trods af en pandemi, praktikophold, rejser og det ber&oslash;gtede akademiske to-legeme-problem er Christina og John kun kommet t&aelig;ttere p&aring; hinanden. De ser ceremonien og festen som en anledning til at fejre en milep&aelig;l i deres forhold sammen med deres n&aelig;rmeste venner og familie.",

  // ---- schedule ----
  "sched.fri": "Fredag den 3. september 2027",
  "sched.sat": "L&oslash;rdag den 4. september 2027",
  "sched.sun": "S&oslash;ndag den 5. september 2027",
  "sched.e1.title": "Polterabend",
  "sched.e1.time": "15.00",
  "sched.e1.addr": "Sted annonceres senere.",
  "sched.e1.desc": "Ledsagere er velkomne.",
  "sched.e2.title": "Kirkelig vielse",
  "sched.e2.time": "Eftermiddag &ndash; tidspunkt f&oslash;lger",
  "sched.e2.attire": "P&aring;kl&aelig;dning: Semiformel",
  "sched.e2.desc": "Ceremonien foreg&aring;r p&aring; dansk og varer omkring en time &mdash; se siden Om os for, hvad du kan forvente.",
  "sched.e3.title": "Middag, kage og fest",
  "sched.e3.time": "Aften &ndash; 17.00",
  "sched.e3.attire": "P&aring;kl&aelig;dning: Semiformel &middot; dansevenligt frem for alt",
  "sched.e3.desc": "Middag, taler, kage og dans til langt ud p&aring; aftenen. Forst&aelig;rkninger ved midnat.",
  "sched.e4.title": "Frokostbuffet med fisk og skaldyr",
  "sched.e4.time": "12.00",
  "sched.e4.desc": "En afslappet afskedsfrokost p&aring; r&oslash;geriet ved havnen, f&oslash;r alle drager hjem.",
  "btn.map": "Kort",
  "btn.cal": "F&oslash;j til kalender",

  // ---- explore ----
  "explore.lede": "Nogle af vores yndlingssteder omkring Snogeb&aelig;k &mdash; hvor man kan spise, og hvordan man tilbringer en rolig dag med at udforske &oslash;en. For endnu flere id&eacute;er er den officielle <a href=\"https://visit-bornholm.com/en/\" target=\"_blank\" rel=\"noopener\">Bornholm-guide</a> et godt sted at starte.",
  "explore.food": "Mad",
  "explore.f1.desc": "Den lokale pub og pizzeria, kendt for sin festlige stemning og maritime indretning.",
  "explore.f2.desc": "Vores s&oslash;ndagsfrokostbuffet holdes her, men stedet er n&aelig;sten helt sikkert et bes&oslash;g v&aelig;rd to gange :)",
  "explore.f3.desc": "Den eneste lokale dagligvarebutik inden for g&aring;afstand, med et overraskende godt udvalg af veganske mejerialternativer.",
  "explore.exp": "Oplevelser",
  "explore.x1.name": "Strand",
  "explore.x1.desc": "Balka Strand er en blid halvm&aring;ne af bl&oslash;dt hvidt sand med lavt, roligt vand &mdash; en let g&aring;tur fra Snogeb&aelig;k og perfekt til en sv&oslash;mmetur eller en langsom morgen ved havet. For det ber&oslash;mte pudderfine sand ligger klitterne ved Dueodde en kort k&oslash;retur mod syd.",
  "explore.x2.name": "Cykling",
  "explore.x2.desc": "Bornholm har et omfattende cykelnetv&aelig;rk langs kysten og i indlandet. I Snogeb&aelig;k udlejer Boss Cykler og AP Cykler cykler for omkring 15 USD om dagen. For ruter kortl&aelig;gger &oslash;ens <a href=\"https://bornholm.info/wp-content/media/2019/05/cykelguide-2019-uk.pdf\" target=\"_blank\" rel=\"noopener\">cykelguide (PDF)</a> natursk&oslash;nne sl&oslash;jfer langs kysten og gennem landskabet.",
  "explore.x3.name": "Genbrug",
  "explore.x3.desc": "Genbrugsbutikker, vintagebutikker og loppemarkeder findes overalt i Danmark og er is&aelig;r talrige p&aring; Bornholm. Ud over de faste butikker (PIF Genbrug, Fru Due og loppemarkedet ved Snogeb&aelig;k havn om l&oslash;rdagen) kan du ind imellem st&oslash;de p&aring; genbrugsboder &mdash; ubemandede loppesalg uden for folks huse &mdash; mens du g&aring;r rundt. De fungerer p&aring; et tillidssystem og tager enten MobilePay eller kontanter. Er du en garvet genbrugsentusiast, anbefaler vi en kort cykeltur til Nex&oslash; for at bes&oslash;ge st&oslash;rre butikker som KlonseKlovnen og Det R&oslash;de Kors.",
  "explore.x4.name": "Vikinge- og historiske steder",
  "explore.x4.desc": "Hammershus, en af Nordeuropas st&oslash;rste borgruiner, kroner klipperne ved &oslash;ens nordlige spids &mdash; en natursk&oslash;n k&oslash;retur v&aelig;rd. T&aelig;ttere p&aring; &oslash;ens middelalderhistorie er Bornholms rundkirker: hvidkalkede f&aelig;stningskirker, hvis indre, som &Oslash;sterlars, stadig b&aelig;rer p&aring; middelalderlige kalkmalerier.",

  // ---- about ----
  "about.why.h": "Hvorfor Bornholm?",
  "about.why.p1": "Bornholm er en fredfyldt, landlig &oslash; i &Oslash;sters&oslash;en. Den er et af danskernes helt store sommerferiem&aring;l og bes&oslash;ges ogs&aring; af tyskere og svenskere. &Oslash;en er ber&oslash;mt for sine r&oslash;gede sild, sine sandstrande og sine fremragende cykelmuligheder. Desuden har &oslash;en en veludbygget infrastruktur af hoteller og udlejningsboliger til bes&oslash;gende.",
  "about.why.p2": "Christina har tilknytning til Bornholm og byen Snogeb&aelig;k p&aring; begge sider af sin familie. Hendes far, Christian, voksede op der, efter at hendes farfar og farmor flyttede til &oslash;en, da han var to &aring;r gammel. Samtidig stammer Christinas mormor og hendes sl&aelig;gt fra Snogeb&aelig;k. Christinas mor, Katarina, er faktisk f&oslash;dt p&aring; Bornholm og bes&oslash;gte stedet mange gange i sin ungdom. Byen er der, hvor Christinas for&aelig;ldre f&oslash;rst m&oslash;dtes, og har v&aelig;ret et fast feriested for familien.",
  "about.why.p3": "Selvom John ikke har familiære b&aring;nd til Bornholm, har han haft forn&oslash;jelsen af at bes&oslash;ge &oslash;en mange gange gennem de seneste &aring;r, hver gang med ophold i Snogeb&aelig;k hos Christinas farmor og farfar. Han har nydt det (som regel) sk&oslash;nne vejr, sandstrandene, det idylliske landskab, de gode cykelture og naturligvis den rigelige r&oslash;gede fisk. John og Christina h&aring;ber, at f&oslash;rstegangsbes&oslash;gende vil finde samme gl&aelig;de ved Bornholm.",
  "about.church.sub": "Ogs&aring; kendt som Poulsker Kirke",
  "about.church.p1": "Sankt Povls Kirke er en dansk luthersk kirke lige uden for Snogeb&aelig;k. Som en af &oslash;ens yngste romanske kirker blev den bygget i 1248. Selvom hverken John eller Christina er praktiserende lutheranere, spiller den danske folkekirke en enorm rolle i at markere kulturelle milep&aelig;le i danskernes liv gennem d&aring;b, konfirmationer, bryllupper og begravelser. Sankt Povls Kirke har krydset Christinas families historie f&oslash;r, som sted for hendes onklers d&aring;b og hendes fars og onklers konfirmationer, og har spillet en vigtig rolle i mange af hendes forf&aelig;dres liv p&aring; morens side. John og Christina h&aring;ber, at I f&aring;r gl&aelig;de af denne smukke bygning, dens historiske (og en anelse pudsige) kunst fra 1500-tallet og udsigten over det omkringliggende landskab.",
  "about.fig1": "Sankt Povls Kirke &mdash; en af Bornholms yngste romanske kirker, bygget i 1248.",
  "about.fig2": "Det fritst&aring;ende klokket&aring;rn.",
  "about.fig3": "Indenfor h&aelig;nger et votivskib over kirkeb&aelig;nkene &mdash; en dansk s&oslash;fartstradition.",
  "about.fig4": "Et udsnit af kirkens herligt pudsige middelalderlige kalkmalerier.",
  "about.folkets.sub": "Det lokale forsamlingshus",
  "about.folkets.p1": "Efter ceremonien i Sankt Povls Kirke holder vi middag og fest i det lokale forsamlingshus, kendt som &bdquo;Folkets Hus&ldquo;. Det ligger langs Snogeb&aelig;ks hovedgade, lige over for havnen.",
  "about.trad.h": "Danske bryllupstraditioner",
  "about.trad.intro": "P&aring; nogle m&aring;der minder danske bryllupper meget om amerikanske. Der er dog et par ting, hvor de adskiller sig, som vi gerne vil g&oslash;re opm&aelig;rksomme p&aring; i god tid, s&aring; alle kan v&aelig;re med.",
  "about.trad.t1.h": "Kirke",
  "about.trad.t1.p": "Ceremonien afholdes overvejende p&aring; dansk og forventes at vare omkring en time. Der vil v&aelig;re flere salmer, som I er velkomne til at synge med p&aring;. Bagefter kaster folk enten ris eller puster s&aelig;bebobler mod parret, n&aring;r de forlader kirken.",
  "about.trad.t2.h": "Taler",
  "about.trad.t2.p": "Det er skik at have nogle f&aring; planlagte taler. I Danmark er enhver, der har lyst til at holde en lille tale eller udbringe en sk&aring;l, velkommen til det gennem middagen &mdash; danskere skriver endda nye tekster til kendte sange, som alle kan synge med p&aring;. Vil du sige et par ord, s&aring; henvend dig til toastmasteren ved middagens begyndelse. Vi byder taler velkomne p&aring; b&aring;de dansk og engelsk.",
  "about.trad.t3.h": "Dans",
  "about.trad.t3.p": "Selvom ethvert godt bryllup inkluderer dans, kan danskerne li&rsquo; at give den gas. V&aelig;r klar til at danse til langt ud p&aring; aftenen. Bliver du sulten, er der forst&aelig;rkninger ved midnat. Drikkevarer fl&oslash;der frit hele vejen igennem.",
  "about.gifts.h": "Gaver &amp; &oslash;nskeliste",
  "about.gifts.p": "Der er ingen &oslash;nskeliste til dette bryllup, og John og Christina forventer ikke gaver. Jeres tilstedev&aelig;relse er alt, der &oslash;nskes. Hvis I insisterer p&aring; at give parret en gave, vil de s&aelig;tte pris p&aring;, at I sender gaver, kontanter eller checks til deres adresse i Boston. Undlad venligst at rejse med gaver til Bornholm, da det vil skabe vanskeligheder, n&aring;r John og Christina skal rejse hjem til USA. Digital pengeoverf&oslash;rsel er ogs&aring; en mulighed. Kontakt venligst John eller Christina for flere oplysninger.",

  // ---- travel ----
  "travel.h1": "Rejsen til Danmark",
  "travel.t1.l1": "Danmark er et sikkert og venligt rejsem&aring;l &mdash; medlem af EU og Schengen-omr&aring;det, i den centraleurop&aelig;iske tidszone (6 timer foran amerikansk &oslash;stkysttid).",
  "travel.t1.l2": "S&oslash;rg for, at dit pas er gyldigt. I skrivende stund beh&oslash;ver amerikanske pasindehavere ikke visum p&aring; forh&aring;nd, men tjek venligst officiel vejledning, inden du rejser.",
  "travel.t1.l3": "Mange amerikanske byer flyver direkte til K&oslash;benhavn (CPH). Fra Michigan skal du sandsynligvis mellemlande i en anden amerikansk by. Billige flyvninger via Island eller Portugal er ogs&aring; almindelige &mdash; John og Christina har taget dem mange gange.",
  "travel.t1.l4": "Danmark er meget engelskvenligt, men det kan stadig betale sig at hente en overs&aelig;ttelses-app. Google Translate kan overs&aelig;tte tekst fra fotos, s&aring; du kan l&aelig;se skilte og dokumenter med din telefons kamera.",
  "travel.h2": "S&aring;dan kommer du til Bornholm (R&oslash;nne)",
  "travel.fig1": "De vigtigste steder for weekenden: <strong>1</strong> f&aelig;rgeterminalen i R&oslash;nne og <strong>2</strong> lufthavnen, begge n&aelig;r vestkysten; dern&aelig;st <strong>3</strong> kirken, <strong>4</strong> Snogeb&aelig;k (Folkets Hus og s&oslash;ndagens fiskefrokost) og <strong>5</strong> Nex&oslash;, den n&aelig;rmeste st&oslash;rre by &mdash; alt sammen ved &oslash;ens syd&oslash;stlige spids.",
  "travel.t2.l1": "Vi anbefaler at flyve til K&oslash;benhavn (CPH). Derfra kan du enten <strong>flyve til Bornholm</strong> eller <strong>tage bus + f&aelig;rge</strong>. Begge bringer dig til R&oslash;nne, &oslash;ens st&oslash;rste by.",
  "travel.t2.l2": "Der er flere daglige direkte flyvninger mellem K&oslash;benhavn (CPH) og R&oslash;nne (RNN) med <a href=\"https://dat.dk/en/\" target=\"_blank\" rel=\"noopener\">DAT</a>, som regel omkring 150 USD tur/retur &mdash; den str&aelig;kning booker du sandsynligvis separat. Hvis du ikke allerede er rejst ind i EU et andet sted, klarer du toldkontrollen i CPH, s&aring; afs&aelig;t tid til mellemlandingen (vi foresl&aring;r 2 timer).",
  "travel.t2.l3": "En billigere, men l&aelig;ngere og mere natursk&oslash;n mulighed er <a href=\"https://www.kombardoexpressen.com/\" target=\"_blank\" rel=\"noopener\">Kombardo Expressen</a> bus + f&aelig;rge: en bus henter dig <a href=\"https://maps.app.goo.gl/ZTjMDK8vCX8YrWko6\" target=\"_blank\" rel=\"noopener\">uden for CPH lufthavn</a> (~45 min til f&aelig;rgeterminalen i Ystad i Sverige), derefter en ~1 times f&aelig;rge til R&oslash;nne. Den kan forts&aelig;tte til Nex&oslash;, et par kilometer &oslash;st for Snogeb&aelig;k, og stopper ogs&aring; i det centrale K&oslash;benhavn. Anbefales ikke, hvis du har meget bagage.",
  "travel.fig2": "Kombardo-busstoppestedet ligger uden for CPH lufthavn ved fjernbusterminalen, foran parkeringshus 10 (P10). Terminalen betjener ogs&aring; Flixbus og andre busser.",
  "travel.h3": "S&aring;dan kommer du til Snogeb&aelig;k",
  "travel.p1": "Snogeb&aelig;k ligger ved &oslash;ens syd&oslash;stlige spids, omkring 20 minutters k&oslash;rsel fra R&oslash;nne. Den offentlige transport p&aring; Bornholm er ret begr&aelig;nset &mdash; busserne k&oslash;rer, men sj&aelig;ldent, is&aelig;r i weekenderne &mdash; s&aring; at leje en bil er langt den nemmeste m&aring;de at komme rundt p&aring;. Vil du hellere undg&aring; at k&oslash;re selv, s&aring; planl&aelig;g taxaer i forvejen og tjek k&oslash;replaner p&aring; &oslash;ens <a href=\"https://visit-bornholm.com/en/transport/public-transport-on-bornholm\" target=\"_blank\" rel=\"noopener\">guide til offentlig transport</a>.",
  "travel.t3.l1": "<strong>Med fly:</strong> fra lufthavnen n&aelig;r R&oslash;nne kan du tage en taxa eller leje en bil til den ~20 minutters k&oslash;retur mod syd&oslash;st til Snogeb&aelig;k.",
  "travel.t3.l2": "<strong>Med f&aelig;rge:</strong> hvis du tager Kombardo bus + f&aelig;rge og ikke planl&aelig;gger at leje bil, s&aring; book din billet hele vejen til <strong>Nex&oslash;</strong> frem for at stoppe i R&oslash;nne &mdash; der er kun et par kilometer til Snogeb&aelig;k (en kort taxatur), langt t&aelig;ttere p&aring; end R&oslash;nne p&aring; den anden side af &oslash;en.",
  "travel.t3.l3": "<strong>Biludlejning:</strong> bem&aelig;rk, at de fleste europ&aelig;iske lejebiler er med manuelt gear &mdash; bestil en med automatgear i forvejen, hvis du har brug for det.",
  "travel.h4": "Hvor du kan bo",
  "travel.s1.meta": "15 min. g&aring; til centrum",
  "travel.s1.p": "Et lille boutiquehotel med 25 v&aelig;relser i Snogeb&aelig;k med komfortable v&aelig;relser og en afslappende atmosf&aelig;re. Bem&aelig;rk, at de ikke tager imod g&aelig;ster under 14 &aring;r. Vi har fortalt ledelsen, at de kan forvente bryllupsg&aelig;ster &mdash; hvis datoerne i september 2027 endnu ikke kan bookes online, s&aring; skriv til <a href=\"mailto:info@blommesplace.com\">info@blommesplace.com</a> med dine datoer, s&aring; reserverer de direkte.",
  "travel.s2.meta": "25 min. g&aring; til centrum",
  "travel.s2.p": "Et afslappet strandhotel mellem fyrretr&aelig;er lige ved Balka Strand &mdash; en af &oslash;ens fineste str&aelig;kninger af bl&oslash;dt hvidt sand. V&aelig;relserne har plads til op til fem (renoveret i 2022), der er en opvarmet pool med b&oslash;rneafdeling, og en kyststi f&oslash;rer langs vandet mod Snogeb&aelig;k. Restauranten serverer daglig morgenbuffet og aftenmenuer. Et dejligt valg for familier &mdash; b&oslash;rn er meget velkomne.",
  "travel.s3.meta": "30 min. g&aring; til centrum",
  "travel.s3.p": "Et hyggeligt, familiedrevet hotel f&aring; minutter fra den b&oslash;rnevenlige Balka Strand, gemt mellem skov og stille kyst. V&aelig;lg et dobbeltv&aelig;relse eller en mere rummelig studio- eller familielejlighed med to soverum, og k&oslash;l af i poolen (nyrenoveret i 2025). Der er restaurant og bar p&aring; stedet, gratis parkering og Wi-Fi, og der er ogs&aring; plads til hunde &mdash; endnu et godt valg for familier.",
  "travel.s4.h": "Feriehuse og udlejning",
  "travel.s4.p": "Snogeb&aelig;k har mange udlejningsmuligheder. Se de link ovenfor for flere oplysninger. Af hensyn til pris og bekvemmelighed anbefaler vi at g&aring; sammen og dele indkvartering, hvor det giver mening.",
  "travel.outro": "Har du andre sp&oslash;rgsm&aring;l om at rejse til Danmark, Bornholm eller Snogeb&aelig;k, s&aring; t&oslash;v ikke med at kontakte John eller Christina.",

  // ---- rsvp (static form chrome) ----
  "rsvp.gate.h": "Denne side er adgangskodebeskyttet",
  "rsvp.gate.p": "Indtast adgangskoden fra din invitationsmail.",
  "rsvp.gate.label": "Adgangskode",
  "rsvp.gate.btn": "L&aring;s op",
  "rsvp.respondby": "Svar venligst inden",
  "rsvp.lookup.p": "Indtast dit navn, som det st&aring;r p&aring; din invitation, for at komme i gang. Hvis dine planer &aelig;ndrer sig senere, s&aring; kom tilbage og sl&aring; dig selv op igen for at rette dit svar.",
  "rsvp.lookup.label": "Fulde navn",
  "rsvp.lookup.btn": "Find min invitation",
  "rsvp.disamb.p": "Mere end &eacute;n person p&aring; g&aelig;stelisten har det navn. Hvem af dem er du?",
  "rsvp.disamb.startover": "← Det er ikke mig, start forfra",
  "rsvp.onlist": "Du st&aring;r p&aring; listen,",
  "rsvp.notyou": "Ikke dig?",
  "rsvp.lookupdiff": "Sl&aring; et andet navn op",
  "rsvp.email.label": "E-mail",
  "rsvp.email.hint": "Vi sender en kopi af dine svar hertil som bekr&aelig;ftelse, eller hvis du senere har brug for at &aelig;ndre dit svar.",
  "rsvp.m.attending": "Deltager du?",
  "rsvp.m.accept": "Deltager med gl&aelig;de",
  "rsvp.m.decline": "M&aring; desv&aelig;rre melde afbud",
  "rsvp.m.dietary": "Kostrestriktioner / pr&aelig;ferencer",
  "rsvp.diet.ph": "f.eks. n&oslash;ddeallergi, glutenfri, vegansk",
  "rsvp.m.lunch": "Interesseret i s&oslash;ndagens fiskebuffet til frokost?",
  "rsvp.yes": "Ja",
  "rsvp.no": "Nej",
  "rsvp.m.lunch.hint": "S&oslash;ndag den 5. kl. 12 p&aring; Snogeb&aelig;k R&oslash;geri &mdash; se <a href=\"schedule.html\" target=\"_blank\" rel=\"noopener\">programmet</a> for mere (&aring;bner i en ny fane, s&aring; du ikke mister dine svar).",
  "rsvp.m.note": "Vil du efterlade en besked?",
  "rsvp.m.note.ph": "Valgfrit &mdash; vi kommer til at savne dig!",
  "rsvp.plusone": "Tager en ledsager med",
  "rsvp.po.name": "Ledsagers navn",
  "rsvp.po.diet": "Ledsagers kostrestriktioner / pr&aelig;ferencer",
  "rsvp.po.lunch": "Er ledsageren interesseret i s&oslash;ndagens fiskebuffet til frokost?",
  "rsvp.po.lunch.al": "Er ledsageren interesseret i s&oslash;ndagens fiskebuffet til frokost",
  "rsvp.children": "B&oslash;rn der deltager",
  "rsvp.children.ph": "f.eks. navne og aldre, eller lad st&aring; tomt hvis ingen",
  "rsvp.songs": "Sang&oslash;nsker",
  "rsvp.songs.ph": "1-2 sange, der f&aring;r dig ud p&aring; dansegulvet",
  "rsvp.anything": "Andet?",
  "rsvp.submit": "Send svar",
  "rsvp.summary.h": "Tak!",
  "rsvp.summary.p1": "Her er, hvad vi har &mdash; en kopi er p&aring; vej til",
  "rsvp.summary.p2": "Planer &aelig;ndrer sig &mdash; du kan komme tilbage og rette dette n&aring;r som helst inden fristen.",
  "rsvp.summary.edit": "Ret mit svar",

  // ---- rsvp (JS-only dynamic strings) ----
  "rsvp.js.contact": "kontakt os",
  "rsvp.js.looking": "Sl&aring;r dig op &hellip;",
  "rsvp.js.notconnected": "Svar er ikke koblet til endnu &mdash; se README for ops&aelig;tning.",
  "rsvp.js.dupname": "Der er mere end &eacute;n g&aelig;st med det navn p&aring; vores liste, og vi kan ikke se herfra, hvem af dem der er dig &mdash; {c}, s&aring; hj&aelig;lper vi dig videre.",
  "rsvp.js.err.lookup": "Noget gik galt, da vi slog din invitation op. Pr&oslash;v venligst igen, eller {c}.",
  "rsvp.js.err.notfound": "Vi kunne ikke finde det navn p&aring; g&aelig;stelisten. Tjek venligst stavningen, eller {c}, hvis du mener, det er en fejl.",
  "rsvp.js.err.deadline": "Fristen for at svare er overskredet, s&aring; svar er lukket her &mdash; {c}, s&aring; finder vi ud af det.",
  "rsvp.js.err.unreachable": "Vi kunne ikke f&aring; fat i g&aelig;stelisten lige nu. Tjek din forbindelse og pr&oslash;v igen, eller {c}.",
  "rsvp.js.submitting": "Sender &hellip;",
  "rsvp.js.err.unconfirmed": "Vi sendte dit svar, men kunne ikke bekr&aelig;fte, at det blev gemt. Pr&oslash;v venligst at sende &eacute;n gang til &mdash; hvis det stadig ikke virker, {c}, s&aring; tilf&oslash;jer vi dig manuelt.",
  "rsvp.js.err.submit": "Noget gik galt, da dit svar skulle sendes. Pr&oslash;v venligst igen, eller {c}, s&aring; tilf&oslash;jer vi dig manuelt.",
  "rsvp.js.attending": "deltager",
  "rsvp.js.notattending": "deltager ikke",
  "rsvp.js.sum.dietary": "Kost:",
  "rsvp.js.sum.lunch": "Kommer til s&oslash;ndagsfrokosten",
  "rsvp.js.sum.plusone": "Ledsager:",
  "rsvp.js.sum.nametocome": "(navn f&oslash;lger)",
  "rsvp.js.sum.children": "B&oslash;rn:",
  "rsvp.js.sum.songs": "Sang&oslash;nsker:",
  "rsvp.js.sum.notes": "Noter:",
  "rsvp.js.sum.you": "dig",
  "rsvp.js.aria.dietary": "Kostrestriktioner / pr&aelig;ferencer",
  "rsvp.js.aria.note": "Efterlad en besked",
};

// JS-only strings (RSVP form) — the English side. These have no home in the
// HTML, so English must live here too. Read via i18n.t(). "{c}" is spliced
// out for the contact phrase by the M() helper in js/rsvp.js.
window.I18N_EN = {
  "rsvp.js.contact": "reach out to us",
  "rsvp.js.looking": "Looking you up&hellip;",
  "rsvp.js.notconnected": "RSVP isn't connected yet &mdash; see README for setup steps.",
  "rsvp.js.dupname": "More than one guest on our list has that name, and we can't tell from here which one is you &mdash; please {c} and we'll get you sorted.",
  "rsvp.js.err.lookup": "Something went wrong looking up your invitation. Please try again, or {c}.",
  "rsvp.js.err.notfound": "We couldn't find that name on the guest list. Please check the spelling, or {c} if you think this is a mistake.",
  "rsvp.js.err.deadline": "The RSVP deadline has passed, so responses are closed here &mdash; please {c} and we'll sort it out.",
  "rsvp.js.err.unreachable": "We couldn't reach the guest list just now. Please check your connection and try again, or {c}.",
  "rsvp.js.submitting": "Submitting&hellip;",
  "rsvp.js.err.unconfirmed": "We sent your RSVP but couldn't confirm it saved. Please try submitting once more &mdash; if it still doesn't stick, {c} and we'll add you by hand.",
  "rsvp.js.err.submit": "Something went wrong submitting your RSVP. Please try again, or {c} and we'll add you by hand.",
  "rsvp.js.attending": "attending",
  "rsvp.js.notattending": "not attending",
  "rsvp.js.sum.dietary": "Dietary:",
  "rsvp.js.sum.lunch": "Coming to the Sunday lunch",
  "rsvp.js.sum.plusone": "Plus-one:",
  "rsvp.js.sum.nametocome": "(name to come)",
  "rsvp.js.sum.children": "Children:",
  "rsvp.js.sum.songs": "Song requests:",
  "rsvp.js.sum.notes": "Notes:",
  "rsvp.js.sum.you": "you",
  "rsvp.js.aria.dietary": "Dietary restrictions / preferences",
  "rsvp.js.aria.note": "Leave a note",
};

(function () {
  var KEY = "wedding_lang";
  var enHTML = new WeakMap();   // element -> original English innerHTML
  var enAttr = new WeakMap();   // element -> { attrName: originalValue }

  function current() {
    return localStorage.getItem(KEY) === "da" ? "da" : "en";
  }

  function setText(el, lang) {
    var key = el.getAttribute("data-i18n");
    if (!enHTML.has(el)) enHTML.set(el, el.innerHTML);
    var da = window.I18N_DA[key];
    el.innerHTML = (lang === "da" && da != null) ? da : enHTML.get(el);
  }

  function setAttr(el, attr, key, lang) {
    var store = enAttr.get(el);
    if (!store) { store = {}; enAttr.set(el, store); }
    if (!(attr in store)) store[attr] = el.getAttribute(attr) || "";
    var da = window.I18N_DA[key];
    el.setAttribute(attr, (lang === "da" && da != null) ? da : store[attr]);
  }

  function apply(root, lang) {
    (root || document).querySelectorAll("[data-i18n]").forEach(function (el) { setText(el, lang); });
    (root || document).querySelectorAll("[data-i18n-ph]").forEach(function (el) { setAttr(el, "placeholder", el.getAttribute("data-i18n-ph"), lang); });
    (root || document).querySelectorAll("[data-i18n-al]").forEach(function (el) { setAttr(el, "aria-label", el.getAttribute("data-i18n-al"), lang); });
  }

  function refreshToggles(lang) {
    document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
      btn.textContent = lang === "da" ? "English" : "Dansk";
      btn.setAttribute("aria-label", lang === "da" ? "Switch to English" : "Skift til dansk");
    });
  }

  function applyAll(lang) {
    document.documentElement.lang = lang;
    apply(document, lang);
    refreshToggles(lang);
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
  }

  window.i18n = {
    lang: current,
    // Translate a bare key for JS-generated content.
    t: function (key) {
      var lang = current();
      if (lang === "da" && window.I18N_DA[key] != null) return window.I18N_DA[key];
      return (window.I18N_EN && window.I18N_EN[key] != null) ? window.I18N_EN[key] : key;
    },
    // Re-translate a freshly-added subtree (e.g. RSVP member blocks).
    translate: function (root) { apply(root, current()); },
    set: function (lang) { localStorage.setItem(KEY, lang); applyAll(lang); },
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.i18n.set(current() === "da" ? "en" : "da");
      });
    });
    applyAll(current());
  });
})();
