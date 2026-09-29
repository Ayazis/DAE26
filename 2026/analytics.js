// Optional visitor statistics with GoatCounter (https://www.goatcounter.com): no cookies, no IP addresses stored, no personal data.
// Off while GOATCOUNTER is empty. To turn it on, sign up for a free GoatCounter site and paste its count URL here.
// Not loaded when running locally, so tests and development don't show up in the stats.
const GOATCOUNTER = ""; // e.g. "https://dae26map.goatcounter.com/count"
if (GOATCOUNTER && location.protocol !== "file:" && !/^(localhost|127\.|\[::1\])/.test(location.hostname)) {
  const sc = document.createElement("script");
  sc.async = true;
  sc.src = "https://gc.zgo.at/count.js";
  sc.dataset.goatcounter = GOATCOUNTER;
  document.head.appendChild(sc);
}
