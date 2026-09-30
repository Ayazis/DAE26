// Optional visitor statistics with GoatCounter (https://www.goatcounter.com): no cookies, no IP addresses stored, no personal data.
// Safe to leave unset: while GOATCOUNTER is empty nothing is loaded or sent, and the privacy policy hides its statistics section.
// Setting it before the GoatCounter site exists is harmless too: GoatCounter rejects the hits and the map works as normal.
// Never counts local runs or PR previews, so testing doesn't end up in the stats.
const GOATCOUNTER = ""; // e.g. "https://dae26map.goatcounter.com/count"
if (!GOATCOUNTER) document.getElementById("stats")?.remove();
else if (location.protocol !== "file:" && !/^(localhost|127\.|\[::1\])/.test(location.hostname)
    && !location.pathname.includes("/pr-preview/")) {
  const sc = document.createElement("script");
  sc.async = true;
  sc.src = "https://gc.zgo.at/count.js";
  sc.dataset.goatcounter = GOATCOUNTER;
  document.head.appendChild(sc);
}
