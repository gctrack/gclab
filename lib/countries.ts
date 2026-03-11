// lib/countries.ts
// Shared country utility — covers all values found in wcf_players.country
// and wcf_player_country_stats.country. Import getFlag and countryName from
// here rather than defining them per-page.

// ── Code → display name ────────────────────────────────────────────────────
export const COUNTRY_NAMES: Record<string, string> = {
  'AU':  'Australia',
  'AT':  'Austria',
  'BE':  'Belgium',
  'BA':  'Bosnia and Herzegovina',
  'CA':  'Canada',
  'CH':  'Switzerland',
  'CZ':  'Czech Republic',
  'DE':  'Germany',
  'DK':  'Denmark',
  'EG':  'Egypt',
  'ES':  'Spain',
  'FI':  'Finland',
  'FR':  'France',
  'GB-ENG': 'England',
  'GB-SCT': 'Scotland',
  'GB-WLS': 'Wales',
  'GR':  'Greece',
  'HK':  'Hong Kong',
  'IE':  'Ireland',
  'IM':  'Isle of Man',
  'IR':  'Iran',
  'IT':  'Italy',
  'JE':  'Jersey',
  'JP':  'Japan',
  'LT':  'Lithuania',
  'LU':  'Luxembourg',
  'LV':  'Latvia',
  'MU':  'Mauritius',
  'MX':  'Mexico',
  'NL':  'Netherlands',
  'NO':  'Norway',
  'NZ':  'New Zealand',
  'PL':  'Poland',
  'PS':  'Palestine',
  'PT':  'Portugal',
  'RU':  'Russia',
  'SE':  'Sweden',
  'UA':  'Ukraine',
  'UY':  'Uruguay',
  'US':  'USA',
  'ZA':  'South Africa',
}

// ── Full name / DB alias → code ────────────────────────────────────────────
// Covers both clean names and the exact strings stored in the DB
const NAME_TO_CODE: Record<string, string> = {
  // Generated from COUNTRY_NAMES
  ...Object.fromEntries(Object.entries(COUNTRY_NAMES).map(([code, name]) => [name, code])),

  // DB aliases in wcf_players.country (stored as full names or truncated)
  'Austria':               'AT',
  'Bosnia and Herzegovi':  'BA',   // truncated in DB
  'Czech Rep':             'CZ',
  'Denmark':               'DK',
  'Finland':               'FI',
  'France':                'FR',
  'Greece':                'GR',
  'Iran':                  'IR',
  'Isle Of Man':           'IM',   // capitalised in DB
  'Italy':                 'IT',
  'Japan':                 'JP',
  'Jersey':                'JE',
  'Lithuania':             'LT',
  'Luxembourg':            'LU',
  'Mauritius':             'MU',
  'Palestine':             'PS',
  'Russia':                'RU',
  'Ukraine':               'UA',
  'Uruguay':               'UY',

  // DB aliases in wcf_player_country_stats.country (stored as full names)
  'Australia':             'AU',
  'Canada':                'CA',
  'Egypt':                 'EG',
  'England':               'GB-ENG',
  'Germany':               'DE',
  'Ireland':               'IE',
  'Latvia':                'LV',
  'Mexico':                'MX',
  'New Zealand':           'NZ',
  'Norway':                'NO',
  'Portugal':              'PT',
  'Scotland':              'GB-SCT',
  'South Africa':          'ZA',
  'Spain':                 'ES',
  'Sweden':                'SE',
  'Switzerland':           'CH',
  'USA':                   'US',
  'Wales':                 'GB-WLS',
}

// ── countryName ────────────────────────────────────────────────────────────
// Returns a display name for any code or full-name input.
export function countryName(input: string): string {
  if (!input) return ''
  // If it's already a code, look up the display name
  if (COUNTRY_NAMES[input]) return COUNTRY_NAMES[input]
  // If it's a full name or alias, resolve to code then display name
  const code = NAME_TO_CODE[input]
  if (code && COUNTRY_NAMES[code]) return COUNTRY_NAMES[code]
  // Fallback: return the raw string
  return input
}

// ── getFlag ────────────────────────────────────────────────────────────────
// Accepts a 2-letter ISO code, a GB subdivision code (GB-ENG etc),
// or a full country name / DB alias (Austria, Czech Rep, etc).
export function getFlag(input: string): string {
  if (!input) return ''

  // Resolve full names / aliases to code first
  const resolved = NAME_TO_CODE[input] || input

  // Special subdivision flags
  if (resolved === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (resolved === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  if (resolved === 'GB-WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿'

  // Isle of Man and Jersey have real ISO codes but use flag emoji directly
  if (resolved === 'IM') return '🇮🇲'
  if (resolved === 'JE') return '🇯🇪'

  // Standard 2-letter ISO → regional indicator emoji
  if (resolved.length !== 2) return ''
  return resolved
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}
