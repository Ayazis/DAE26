// EN/NL strings for privacy.html and terms.html, merged into I18N from i18n.js (load after it).
// Also wires up the language button on those pages, since app.js is not loaded there.
Object.assign(I18N.en, {
  back_map: "Back to the map",
  contact_h: "Contact",

  pv_title: "Privacy policy – DAE 2026 Floor Map",
  pv_h1: "Privacy policy",
  pv_intro_html: "<strong>DAE 2026 Floor Map</strong> is an unofficial, free floor map for the Dutch Audio Event 2026. It is not affiliated with the event organisers. Last updated: 26 September 2026.",
  pv_store_h: "What the app stores",
  pv_store: "Your favorites, notes, visited marks, ratings and theme choice are stored only in your own browser (local storage) on your device. The app has no server, no accounts and no analytics, and the developer cannot see this data.",
  pv_drive_h: "Optional Google Drive backup",
  pv_drive_html: "If the Google Drive backup feature is enabled and you choose to use it, the app asks you to sign in with Google and grants access to one thing only: a private, hidden app-data folder in your own Google Drive (scope <code>drive.appdata</code>). The app cannot see, read or change any of your other Drive files.",
  pv_drive_list_html: `<li><strong>What is uploaded:</strong> one file, <code>dae2026-backup.json</code>, containing your favorites, notes, visited marks and ratings, only when you press "Back up to Google Drive".</li>
<li><strong>Where it goes:</strong> directly from your browser to your own Google Drive. It does not pass through, and is not stored on, any server run by the developer.</li>
<li><strong>What the developer receives:</strong> nothing. No name, email address or other Google account information is collected or kept. The sign-in token stays in your browser's memory and is discarded when you close the app or press "Disconnect Google Drive".</li>
<li><strong>No sharing or selling:</strong> your data is not shared with, sold to, or used by anyone else, for advertising or otherwise.</li>
<li>Google's script is loaded only after you first press a Google Drive button. Google's handling of your data is covered by <a href="https://policies.google.com/privacy" rel="noopener">Google's privacy policy</a>.</li>`,
  pv_limited_html: 'The app\'s use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener">Google API Services User Data Policy</a>, including the Limited Use requirements.',
  pv_delete_h: "Deleting your data",
  pv_delete_list_html: `<li><strong>Local data:</strong> clear this site's data in your browser settings.</li>
<li><strong>Drive backup:</strong> in your Google account, go to Drive settings → Manage apps, find this app and choose "Delete hidden app data", or remove the app's access at <a href="https://myaccount.google.com/permissions" rel="noopener">myaccount.google.com/permissions</a>.</li>`,
  pv_net_h: "Other network requests",
  pv_net: "The app loads fonts from Google Fonts, and exhibitor links open the exhibitors' own websites. Those services may receive your IP address as any website would.",
  pv_contact_html: "Questions: <strong>daemap26@outlook.com</strong>",

  tos_title: "Terms of service – DAE 2026 Floor Map",
  tos_h1: "Terms of service",
  tos_intro_html: "<strong>DAE 2026 Floor Map</strong> is a free, unofficial floor map for the Dutch Audio Event 2026. It is not run by the event organisers, but is shared with their explicit permission. Last updated: 28 September 2026.",
  tos_use_h: "Use of the app",
  tos_use_html: 'You may use the app free of charge for personal purposes. It is provided "as is", without warranties of any kind. Room and exhibitor information is collected from the event\'s public website and may be incomplete or out of date; check <a href="https://dutchaudioevent.nl/merken" rel="noopener">dutchaudioevent.nl</a> for the latest details.',
  tos_data_h: "Your data and backups",
  tos_data_html: 'Your favorites and notes are stored in your own browser. The optional Google Drive backup copies them to a hidden folder in your own Google Drive, and only when you ask it to. You are responsible for keeping your own copies; the developer cannot recover lost data. See the <a href="privacy.html">privacy policy</a> for details.',
  tos_liab_h: "Liability",
  tos_liab: "To the extent permitted by law, the developer is not liable for any loss or damage arising from use of the app, including lost or corrupted data or incorrect event information.",
  tos_change_h: "Changes and availability",
  tos_change: "The app or these terms may change, and the service may be withdrawn at any time, for example after the event."
});

Object.assign(I18N.nl, {
  back_map: "Terug naar de plattegrond",
  contact_h: "Contact",

  pv_title: "Privacybeleid – DAE 2026 Plattegrond",
  pv_h1: "Privacybeleid",
  pv_intro_html: "<strong>DAE 2026 Plattegrond</strong> is een onofficiële, gratis plattegrond voor het Dutch Audio Event 2026. De app is niet verbonden aan de organisatie van het evenement. Laatst bijgewerkt: 26 september 2026.",
  pv_store_h: "Wat de app opslaat",
  pv_store: "Je favorieten, notities, bezocht-markeringen, beoordelingen en themakeuze worden alleen in je eigen browser (local storage) op je apparaat opgeslagen. De app heeft geen server, geen accounts en geen analytics, en de ontwikkelaar kan deze gegevens niet inzien.",
  pv_drive_h: "Optionele Google Drive-backup",
  pv_drive_html: "Als de Google Drive-backup beschikbaar is en je ervoor kiest die te gebruiken, vraagt de app je in te loggen met Google en krijgt de app toegang tot slechts één ding: een privé, verborgen app-gegevensmap in je eigen Google Drive (scope <code>drive.appdata</code>). De app kan je andere Drive-bestanden niet zien, lezen of wijzigen.",
  pv_drive_list_html: `<li><strong>Wat er wordt geüpload:</strong> één bestand, <code>dae2026-backup.json</code>, met je favorieten, notities, bezocht-markeringen en beoordelingen, en alleen wanneer je op "Backuppen naar Google Drive" drukt.</li>
<li><strong>Waar het naartoe gaat:</strong> rechtstreeks van je browser naar je eigen Google Drive. Het gaat niet via een server van de ontwikkelaar en wordt daar ook niet opgeslagen.</li>
<li><strong>Wat de ontwikkelaar ontvangt:</strong> niets. Er worden geen naam, e-mailadres of andere Google-accountgegevens verzameld of bewaard. Het inlogtoken blijft in het geheugen van je browser en wordt verwijderd wanneer je de app sluit of op "Google Drive ontkoppelen" drukt.</li>
<li><strong>Geen delen of verkopen:</strong> je gegevens worden niet gedeeld met, verkocht aan of gebruikt door anderen, voor advertenties of anderszins.</li>
<li>Het script van Google wordt pas geladen nadat je voor het eerst op een Google Drive-knop drukt. Hoe Google met je gegevens omgaat, staat in het <a href="https://policies.google.com/privacy" rel="noopener">privacybeleid van Google</a>.</li>`,
  pv_limited_html: 'Het gebruik door de app van informatie die via Google API\'s wordt ontvangen, voldoet aan de <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener">Google API Services User Data Policy</a>, inclusief de vereisten voor beperkt gebruik (Limited Use).',
  pv_delete_h: "Je gegevens verwijderen",
  pv_delete_list_html: `<li><strong>Lokale gegevens:</strong> wis de gegevens van deze site via de instellingen van je browser.</li>
<li><strong>Drive-backup:</strong> ga in je Google-account naar Drive-instellingen → Apps beheren, zoek deze app en kies "Verborgen app-gegevens verwijderen", of trek de toegang van de app in via <a href="https://myaccount.google.com/permissions" rel="noopener">myaccount.google.com/permissions</a>.</li>`,
  pv_net_h: "Overige netwerkverzoeken",
  pv_net: "De app laadt lettertypen van Google Fonts, en links naar exposanten openen de eigen websites van die exposanten. Die diensten kunnen je IP-adres ontvangen, zoals bij elke website.",
  pv_contact_html: "Vragen: <strong>daemap26@outlook.com</strong>",

  tos_title: "Gebruiksvoorwaarden – DAE 2026 Plattegrond",
  tos_h1: "Gebruiksvoorwaarden",
  tos_intro_html: "<strong>DAE 2026 Plattegrond</strong> is een gratis, onofficiële plattegrond voor het Dutch Audio Event 2026. De app wordt niet door de organisatie van het evenement beheerd, maar wordt met hun uitdrukkelijke toestemming gedeeld. Laatst bijgewerkt: 28 september 2026.",
  tos_use_h: "Gebruik van de app",
  tos_use_html: 'Je mag de app kosteloos gebruiken voor persoonlijke doeleinden. De app wordt geleverd "zoals hij is", zonder enige garantie. Informatie over ruimtes en exposanten is verzameld van de openbare website van het evenement en kan onvolledig of verouderd zijn; kijk op <a href="https://dutchaudioevent.nl/merken" rel="noopener">dutchaudioevent.nl</a> voor de laatste gegevens.',
  tos_data_h: "Je gegevens en backups",
  tos_data_html: 'Je favorieten en notities worden in je eigen browser opgeslagen. De optionele Google Drive-backup kopieert ze naar een verborgen map in je eigen Google Drive, en alleen wanneer je daarom vraagt. Je bent zelf verantwoordelijk voor het bewaren van je eigen kopieën; de ontwikkelaar kan verloren gegevens niet herstellen. Zie het <a href="privacy.html">privacybeleid</a> voor details.',
  tos_liab_h: "Aansprakelijkheid",
  tos_liab: "Voor zover wettelijk toegestaan is de ontwikkelaar niet aansprakelijk voor verlies of schade die voortvloeit uit het gebruik van de app, waaronder verloren of beschadigde gegevens of onjuiste informatie over het evenement.",
  tos_change_h: "Wijzigingen en beschikbaarheid",
  tos_change: "De app of deze voorwaarden kunnen worden gewijzigd, en de dienst kan op elk moment worden stopgezet, bijvoorbeeld na het evenement."
});

document.getElementById("lang").addEventListener("click",()=>setLang(LANG==="nl"?"en":"nl"));
applyI18n();
