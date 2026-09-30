// EN/NL strings for the app UI. Strings for privacy.html and terms.html live in legal.js.
// t(key, vars) looks up the current language, falling back to English, and fills in {{name}} tokens.
const I18N = {
  en: {
    title: "DAE 2026 Interactive Floorplan",
    h1: "Dutch Audio Event 2026 · Interactive Floorplan",
    dark_mode: "Dark mode",
    sub_html: 'NOTE: This is an independent, unofficial fan map and is not affiliated with or endorsed by Dutch Audio Event. See the <a href="terms.html">Terms</a> and <a href="privacy.html">Privacy Policy</a>.',
    search_placeholder: "Find a brand, exhibitor, room or note…",
    search_label: "Search",
    fullscreen: "Fullscreen",
    svg_label: "Floor plan of NH Koningshof with the four colour zones",
    zones_label: "Filter rooms",
    hires: "High res",
    hires_title: "On: redrawn map. Off: original floor plan image",
    hint: "Drag to move, pinch or scroll to zoom. Tap a room to see its exhibitors. Grey rooms have no exhibitor listed.",
    favh: "★ Favorites",
    toolsh: "Share & backup",
    share: "Share favorites",
    backup_placeholder: "Backup…",
    backup_local: "Save to a local file",
    backup_drive: "Back up to Google Drive",
    restore_placeholder: "Restore…",
    restore_local: "Restore from a local file",
    restore_drive: "Restore from Google Drive",
    feedbackh: "Feedback",
    feedback_html: 'Spotted a wrong room, a missing brand, or a bug? Share your thoughts with us at <a href="mailto:daemap26@outlook.com">daemap26@outlook.com</a>.',
    footer_html: 'Room and brand data from <a href="https://dutchaudioevent.nl/merken" target="_blank" rel="noopener">dutchaudioevent.nl</a>, collected 26 September 2026. Previews of what each room demos come from <a href="https://hifi.nl/artikel/dutch-audio-event-2026-op-10-en-11-oktober-groter-dan-ooit" target="_blank" rel="noopener">HiFi.nl</a>, used with permission. When an exhibitor uses several rooms, the site lists one set of brands for all of them. Check the site for late changes. Your favorites and notes are stored only in this browser. Works offline after the first visit. <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a>',
    lang_switch: "NL",
    lang_title: "Switch to Dutch",

    room_label: "Room {{n}}",
    icon_wc: "Toilets",
    icon_lift: "Elevator",
    icon_info: "Info point",
    icon_food: "Catering",
    icon_coat: "Wardrobe",
    icon_aid: "First aid / AED",
    favorite: "Favorite",
    close: "Close",
    mark_visited: "Mark visited",
    visited: "✓ Visited",
    your_rating: "Your rating",
    n_of_5: "{{n}} of 5",
    notes_placeholder: "Your notes for this room…",
    no_brands: "No brands listed on the site",
    not_in_use: "Not in use",
    also_in: "Also in ",
    view_page: "View page ↗",
    read_more: "Read more",
    read_less: "Show less",
    pv_source: "Source:",
    pv_translated: "(translated from Dutch)",
    pv_dutch: "(in Dutch)",
    hits_count: "{{n}} {{noun}}:",
    room_word_one: "room",
    room_word_many: "rooms",
    no_matches: 'No room matches “{{q}}”.',
    favs_empty: "Tap ☆ in a room's popup to add it here.",
    progress_fav: "{{favSeen}} of {{favTotal}} favorites visited · {{seen}} of {{all}} rooms visited",
    progress_all: "{{seen}} of {{all}} rooms visited",
    add_favs_first: "Add some favorites first.",
    share_title: "My DAE 2026 favorites",
    link_copied: "Link copied. Anyone who opens it can add your favorites.",
    copy_this_link: "Copy this link:",
    favorite_word_one: "favorite",
    favorite_word_many: "favorites",
    add_shared_favs_confirm: "Add {{n}} shared {{noun}} ({{list}})?",
    added_favs: "Added {{n}} {{noun}}.",
    drive_loading: "Google Drive is still loading, try again in a moment.",
    restore_confirm: "Restore {{n}} {{noun}} from {{source}}? This replaces your current favorites, notes and ratings.",
    backup_restored: "Backup restored.",
    this_backup_source: "this backup",
    file_read_error: "Could not read that file: {{msg}}",
    err_not_backup: "not a DAE 2026 backup",
    err_newer_backup: "this backup is from a newer version of the app",

    drive_signin_unavailable: "Google sign-in is unavailable (offline?)",
    drive_signin_cancelled: "sign-in cancelled",
    drive_signin_failed: "sign-in failed",
    drive_session_expired: "session expired, try again",
    drive_error: "Google Drive error {{status}}",
    drive_replace_confirm: "A backup from {{when}} already exists in Google Drive and is newer than this device's last sync. Replace it with this device's data?",
    drive_backup_source: "the Google Drive backup from {{when}}",
    drive_backed_up: "Backed up to Google Drive at {{time}}.",
    drive_no_backup: "No backup found in Google Drive yet.",
    drive_error_msg: "Google Drive: {{msg}}."
  },
  nl: {
    title: "DAE 2026 Interactieve plattegrond",
    h1: "Dutch Audio Event 2026 · Interactieve plattegrond",
    dark_mode: "Donkere modus",
    sub_html: 'LET OP: dit is een onafhankelijke, niet-officiële fanplattegrond en is niet gelieerd aan of goedgekeurd door Dutch Audio Event. Zie de <a href="terms.html">Voorwaarden</a> en het <a href="privacy.html">Privacybeleid</a>.',
    search_placeholder: "Zoek een merk, exposant, ruimte of notitie…",
    search_label: "Zoeken",
    fullscreen: "Volledig scherm",
    svg_label: "Plattegrond van NH Koningshof met de vier kleurzones",
    zones_label: "Ruimtes filteren",
    hires: "Hoge resolutie",
    hires_title: "Aan: opnieuw getekende kaart. Uit: originele plattegrondafbeelding",
    hint: "Sleep om te verplaatsen, knijp of scroll om te zoomen. Tik op een ruimte voor de exposanten. Grijze ruimtes hebben geen exposant vermeld.",
    favh: "★ Favorieten",
    toolsh: "Delen & backup",
    share: "Favorieten delen",
    backup_placeholder: "Backup…",
    backup_local: "Opslaan naar een lokaal bestand",
    backup_drive: "Backuppen naar Google Drive",
    restore_placeholder: "Herstellen…",
    restore_local: "Herstellen vanuit een lokaal bestand",
    restore_drive: "Herstellen vanuit Google Drive",
    feedbackh: "Feedback",
    feedback_html: 'Een verkeerde ruimte, een ontbrekend merk of een bug gezien? Laat het ons weten via <a href="mailto:daemap26@outlook.com">daemap26@outlook.com</a>.',
    footer_html: 'Ruimte- en merkgegevens van <a href="https://dutchaudioevent.nl/merken" target="_blank" rel="noopener">dutchaudioevent.nl</a>, verzameld op 26 september 2026. Voorbeschouwingen van wat er per ruimte te horen is komen van <a href="https://hifi.nl/artikel/dutch-audio-event-2026-op-10-en-11-oktober-groter-dan-ooit" target="_blank" rel="noopener">HiFi.nl</a>, gebruikt met toestemming. Als een exposant meerdere ruimtes gebruikt, vermeldt de site één set merken voor alle ruimtes samen. Kijk op de site voor eventuele late wijzigingen. Je favorieten en notities worden alleen in deze browser opgeslagen. Werkt offline na het eerste bezoek. <a href="privacy.html">Privacy</a> · <a href="terms.html">Voorwaarden</a>',
    lang_switch: "EN",
    lang_title: "Switch to English",

    room_label: "Kamer {{n}}",
    icon_wc: "Toiletten",
    icon_lift: "Lift",
    icon_info: "Infopunt",
    icon_food: "Catering",
    icon_coat: "Garderobe",
    icon_aid: "EHBO / AED",
    favorite: "Favoriet",
    close: "Sluiten",
    mark_visited: "Markeer bezocht",
    visited: "✓ Bezocht",
    your_rating: "Jouw score",
    n_of_5: "{{n}} van 5",
    notes_placeholder: "Jouw notities voor deze ruimte…",
    no_brands: "Geen merken vermeld op de site",
    not_in_use: "Niet in gebruik",
    also_in: "Ook in ",
    view_page: "Bekijk pagina ↗",
    read_more: "Lees meer",
    read_less: "Minder",
    pv_source: "Bron:",
    hits_count: "{{n}} {{noun}}:",
    room_word_one: "ruimte",
    room_word_many: "ruimtes",
    no_matches: "Geen ruimte komt overeen met “{{q}}”.",
    favs_empty: "Tik op ☆ in het venster van een ruimte om deze hier toe te voegen.",
    progress_fav: "{{favSeen}} van {{favTotal}} favorieten bezocht · {{seen}} van {{all}} ruimtes bezocht",
    progress_all: "{{seen}} van {{all}} ruimtes bezocht",
    add_favs_first: "Voeg eerst wat favorieten toe.",
    share_title: "Mijn DAE 2026 favorieten",
    link_copied: "Link gekopieerd. Iedereen die deze opent kan jouw favorieten toevoegen.",
    copy_this_link: "Kopieer deze link:",
    favorite_word_one: "favoriet",
    favorite_word_many: "favorieten",
    add_shared_favs_confirm: "{{n}} gedeelde {{noun}} toevoegen ({{list}})?",
    added_favs: "{{n}} {{noun}} toegevoegd.",
    drive_loading: "Google Drive wordt nog geladen, probeer het zo opnieuw.",
    restore_confirm: "{{n}} {{noun}} herstellen vanuit {{source}}? Dit vervangt je huidige favorieten, notities en scores.",
    backup_restored: "Backup hersteld.",
    this_backup_source: "deze backup",
    file_read_error: "Kan dit bestand niet lezen: {{msg}}",
    err_not_backup: "geen DAE 2026-backup",
    err_newer_backup: "deze backup komt van een nieuwere versie van de app",

    drive_signin_unavailable: "Google-aanmelding is niet beschikbaar (offline?)",
    drive_signin_cancelled: "aanmelding geannuleerd",
    drive_signin_failed: "aanmelding mislukt",
    drive_session_expired: "sessie verlopen, probeer het opnieuw",
    drive_error: "Google Drive-fout {{status}}",
    drive_replace_confirm: "Er bestaat al een backup van {{when}} in Google Drive die nieuwer is dan de laatste synchronisatie van dit apparaat. Vervangen door de gegevens van dit apparaat?",
    drive_backup_source: "de Google Drive-backup van {{when}}",
    drive_backed_up: "Gebackupt naar Google Drive om {{time}}.",
    drive_no_backup: "Nog geen backup gevonden in Google Drive.",
    drive_error_msg: "Google Drive: {{msg}}."
  }
};

// PR previews (…/pr-preview/pr-12/2026/) share the live site's origin, so they keep their own saved data.
const PREVIEW = (location.pathname.match(/\/pr-preview\/([^/]+)\//) || [])[1] || "";
// All user data lives under one versioned localStorage key.
const STORE_KEY = "daem-2026-v1" + (PREVIEW ? "@" + PREVIEW : "");
const LANG_KEY = "lang";
let LANG = (()=>{
  try{
    const d = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    if(d.lang==="en"||d.lang==="nl") return d.lang;
  }catch(e){}
  return navigator.language && navigator.language.toLowerCase().startsWith("nl") ? "nl" : "en";
})();

function noun(word, n){ return t(word+"_word_"+(n===1?"one":"many")); }
function t(key, vars){
  let s = (I18N[LANG]&&I18N[LANG][key]) ?? I18N.en[key] ?? key;
  if(vars) for(const k in vars) s = s.replaceAll("{{"+k+"}}", vars[k]);
  return s;
}
function setLang(lang){
  LANG = lang==="nl" ? "nl" : "en";
  try{
    const d = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    d.lang = LANG;
    localStorage.setItem(STORE_KEY, JSON.stringify(d));
  }catch(e){}
  document.documentElement.lang = LANG;
  applyI18n();
  if(typeof onLangChange==="function") onLangChange();
}
function applyI18n(){
  document.title = t(document.documentElement.dataset.i18nTitle || "title");
  document.querySelectorAll("[data-i18n]").forEach(n=>{ n.textContent = t(n.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach(n=>{ n.innerHTML = t(n.dataset.i18nHtml); });
  document.querySelectorAll("[data-i18n-attr]").forEach(n=>{
    n.dataset.i18nAttr.split("|").forEach(pair=>{ const [attr,key]=pair.split(":"); n.setAttribute(attr, t(key)); });
  });
  const lb=document.getElementById("lang");
  if(lb){ lb.textContent = t("lang_switch"); lb.title = t("lang_title"); }
}
document.documentElement.lang = LANG;
