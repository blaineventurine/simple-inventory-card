const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, '../src/translations');
const BASE_LANG = 'en';

function flattenObject(obj, prefix = '') {
  const flattened = {};
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(flattened, flattenObject(obj[key], newKey));
    } else {
      flattened[newKey] = obj[key];
    }
  }
  return flattened;
}

function checkTranslations() {
  console.log('🌍 Checking translation completeness...\n');

  // Read base language file
  const baseFile = path.join(TRANSLATIONS_DIR, `${BASE_LANG}.json`);
  if (!fs.existsSync(baseFile)) {
    console.error(`❌ Base language file ${baseFile} not found!`);
    process.exit(1);
  }

  const baseTranslations = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
  const baseKeys = flattenObject(baseTranslations);
  const baseKeyList = Object.keys(baseKeys).sort();

  console.log(`📝 Base language (${BASE_LANG}) has ${baseKeyList.length} keys\n`);

  // Check all other language files
  const translationFiles = fs
    .readdirSync(TRANSLATIONS_DIR)
    .filter((file) => file.endsWith('.json') && file !== `${BASE_LANG}.json`)
    .map((file) => file.replace('.json', ''));

  let hasIssues = false;

  for (const lang of translationFiles) {
    const langFile = path.join(TRANSLATIONS_DIR, `${lang}.json`);
    const langTranslations = JSON.parse(fs.readFileSync(langFile, 'utf8'));
    const langKeys = flattenObject(langTranslations);
    const langKeyList = Object.keys(langKeys).sort();

    const missingKeys = baseKeyList.filter((key) => !langKeys.hasOwnProperty(key));
    const extraKeys = langKeyList.filter((key) => !baseKeys.hasOwnProperty(key));
    const completeness = (
      ((langKeyList.length - extraKeys.length) / baseKeyList.length) *
      100
    ).toFixed(1);

    console.log(`🏳️  ${lang.toUpperCase()} (${completeness}% complete)`);

    if (missingKeys.length > 0) {
      hasIssues = true;
      console.log(`   ❌ Missing ${missingKeys.length} keys:`);
      missingKeys.forEach((key) => console.log(`      - ${key}`));
    }

    if (extraKeys.length > 0) {
      console.log(`   ⚠️  Extra ${extraKeys.length} keys (not in base):`);
      extraKeys.forEach((key) => console.log(`      + ${key}`));
    }

    if (missingKeys.length === 0 && extraKeys.length === 0) {
      console.log(`   ✅ Complete!`);
    }

    console.log();
  }

  if (hasIssues) {
    console.log('❌ Translation check failed - missing keys found!');
    process.exit(1);
  } else {
    console.log('✅ All translations are complete!');
  }
}

checkTranslations();
