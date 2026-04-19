/**
 * Generate Swedish character URL variants for ferries
 * Dynamically maps ASCII ferry IDs to Swedish character equivalents
 * Examples: "skaldo" → "skåldö", "hogsara" → "högsåra"
 */

/**
 * Convert ferry name to URL-friendly format (ASCII)
 * Used for canonical URLs: "Barösund" → "barosund"
 */
export function ferryNameToAsciiUrl(name) {
  return name
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert ferry name to URL-friendly format (Swedish characters)
 * Used as alias: "Barösund" → "barösund"
 */
export function ferryNameToSwedishUrl(name) {
  return name
    .toLowerCase()
    .replace(/[^a-zåäö0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get Swedish variant of ASCII ferry ID
 * Static mapping as fallback for older data
 */
function getSwedishVariantStatic(ferryId) {
  const variants = {
    skaldo: 'skåldö',
    hogsara: 'högsåra',
    barosund: 'barösund',
    kasnas: 'kasnäs',
    karlo: 'karlö',
    vartsala: 'värtsilä',
    keistio: 'keistiö',
    'skargardens-ringvag-houtskar-inio': 'skärgårdens-ringväg-houtskär-iniö',
    'inio-gustavs': 'iniö-gustavs',
  };
  return variants[ferryId.toLowerCase()] || null;
}

/**
 * Normalize a URL segment (potentially with Swedish characters) to ASCII ferry ID
 * Examples: "skåldö" → "skaldo", "högsåra" → "hogsara"
 */
export function normalizeToFerryId(input) {
  if (!input) return null;

  // Already ASCII - return as-is
  if (/^[a-z0-9\-]+$/.test(input)) {
    return input;
  }

  // Try to find it in reverse mapping
  const reverseMap = {
    skåldö: 'skaldo',
    högsåra: 'hogsara',
    barösund: 'barosund',
    kasnäs: 'kasnas',
    karlö: 'karlo',
    värtsilä: 'vartsala',
    keistiö: 'keistio',
    'skärgårdens-ringväg-houtskär-iniö': 'skargardens-ringvag-houtskar-inio',
    'iniö-gustavs': 'inio-gustavs',
    'nagu-korpo': 'nagu-korpo',
    'pargas-nagu': 'pargas-nagu',
    'palva': 'palva',
    'pellinge': 'pellinge',
    'puutossalmi': 'puutossalmi',
    'velkuanmaa': 'velkuanmaa',
  };

  const normalized = reverseMap[input.toLowerCase()];
  if (normalized) return normalized;

  // Try ASCII conversion as fallback
  const asciiConverted = ferryNameToAsciiUrl(input);
  if (/^[a-z0-9\-]+$/.test(asciiConverted)) {
    return asciiConverted;
  }

  return null;
}

/**
 * Generate all URL variants for a ferry from ferries data
 * Returns { ascii: "skaldo", swedish: "skåldö" }
 */
export function generateFerryUrlVariants(ferryData) {
  if (!ferryData) return null;

  const { id, name } = ferryData;
  const ascii = id;
  const swedish = ferryNameToSwedishUrl(name);

  return {
    ascii,
    swedish: swedish !== ascii ? swedish : null,
    name,
  };
}

/**
 * Get all URL path variants for a ferry (for routing)
 * Returns array like: ['skaldo', 'skåldö']
 */
export function getAllFerryUrlVariants(ferryData) {
  if (!ferryData) return [null];

  const variants = generateFerryUrlVariants(ferryData);
  const urls = [variants.ascii];

  if (variants.swedish) {
    urls.push(variants.swedish);
  }

  return urls;
}
