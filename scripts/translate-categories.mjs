#!/usr/bin/env node
import path from "node:path";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
const { translate } = await import("@vitalets/google-translate-api");

const DB_PATH = process.env.PUBLIC_LISTINGS_SQLITE_PATH ||
  path.join(process.cwd(), "data", "public-listings.sqlite");
const LOCALES_DIR = path.join(process.cwd(), "public", "locales");
const LOCALES = ["ru", "en", "tr"];

async function translateText(text, to) {
  try {
    const result = await translate(text, { from: "az", to });
    return result.text;
  } catch {
    try {
      await new Promise(r => setTimeout(r, 2000));
      const result = await translate(text, { from: "az", to });
      return result.text;
    } catch (err) {
      console.error(`  Translate failed (${to}): ${err.message}`);
      return null;
    }
  }
}

function loadLocale(locale) {
  try {
    return JSON.parse(readFileSync(path.join(LOCALES_DIR, `${locale}.json`), "utf8"));
  } catch {
    return {};
  }
}

function saveLocale(locale, data) {
  writeFileSync(
    path.join(LOCALES_DIR, `${locale}.json`),
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
}

const db = new DatabaseSync(DB_PATH);
const categories = db.prepare("SELECT id, label, label_translations FROM public_categories").all();

console.log(`Found ${categories.length} categories to translate.\n`);

for (const cat of categories) {
  let translations = {};
  try {
    translations = cat.label_translations ? JSON.parse(cat.label_translations) : {};
  } catch {
    translations = {};
  }

  console.log(`[${cat.id}] "${cat.label}"`);
  let changed = false;

  for (const locale of LOCALES) {
    if (translations[locale]) {
      console.log(`  ${locale}: already set → "${translations[locale]}"`);
      continue;
    }

    await new Promise(r => setTimeout(r, 500));
    const translated = await translateText(cat.label, locale);
    if (translated) {
      translations[locale] = translated;
      console.log(`  ${locale}: "${translated}"`);
      changed = true;
    }
  }

  if (changed) {
    db.prepare("UPDATE public_categories SET label_translations = ? WHERE id = ?")
      .run(JSON.stringify(translations), cat.id);
  }

  const chipKey = `catalog_chip_${cat.id}`;
  const azData = loadLocale("az");
  azData[chipKey] = cat.label;
  saveLocale("az", azData);

  for (const locale of LOCALES) {
    if (translations[locale]) {
      const data = loadLocale(locale);
      data[chipKey] = translations[locale];
      saveLocale(locale, data);
    }
  }
}

db.close();
console.log("\nDone! All categories translated and locale JSONs updated.");