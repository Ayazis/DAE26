// JS coverage of the app code, collected from every test's page (Chromium V8 coverage) and reported by monocart.
// The report (console summary, coverage/index.html, coverage/coverage-details.md, coverage/lcov.info) is written after the whole run.
const fs = require("fs");
const path = require("path");
const MCR = require("monocart-coverage-reports");

// Only the app's own code counts; data.js and hifi.js are generated data, and inline scripts aren't worth measuring.
const APP = /\/2026\/(app|gdrive|i18n|legal|plan|analytics)\.js(\?|$)/;

const options = {
  name: "DAE26 app coverage",
  outputDir: "./coverage",
  reports: ["console-summary", "markdown-details", "v8", "lcovonly"],
  sourcePath: p => p.replace(/^.*?\/2026\//, "2026/").replace(/\?.*$/, ""),
  cleanCache: false,
};

// A test may serve a rewritten file (see withFeatures in features.spec.js). If the rewrite kept every byte offset, its
// coverage still applies to the file on disk and is merged into it; otherwise it is left out.
const onDisk = {};
const diskSource = url => onDisk[url] ??= fs.readFileSync(path.join(__dirname, "..", options.sourcePath(new URL(url).pathname)), "utf8");

async function add(entries) {
  entries = entries.filter(e => APP.test(e.url) && e.source.length === diskSource(e.url).length)
    .map(e => ({ ...e, source: diskSource(e.url) }));
  if (entries.length) await MCR(options).add(entries);
}
async function setup() { await MCR(options).cleanCache(); }
async function teardown() { await MCR(options).generate(); }

module.exports = { add, setup, teardown };
