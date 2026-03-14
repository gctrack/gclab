import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Canadian clubs — scraped from https://croquet.ca/affiliated-clubs.html ───
// Source: Croquet Canada affiliated clubs page, March 2026.
// Seeded as verified=true since sourced from the national organisation.

const CANADA_CLUBS = [
  // ── Ontario ──────────────────────────────────────────────────────────────
  {
    canonical_name: 'Bayfield International Croquet Club',
    short_name: 'BICC',
    country: 'CA', region: 'ON', city: 'Bayfield',
    address_line1: '100 David St', postal_code: 'N0M 1G0',
    phone: '(519) 565-5480',
    website: 'https://bicc.ca',
    court_count: 3,
    notes: 'Open 7 days/week; guests welcome with notice, no fee',
  },
  {
    canonical_name: 'Caledon Croquet Club',
    country: 'CA', region: 'ON', city: 'Caledon',
    contact_name: 'John Richardson',
    phone: '905-838-2163',
    email: 'richjon.d@gmail.com',
    court_count: 1,
    notes: 'Play Tue/Thu 9:30–12:30; guests welcome with notice, no fee',
  },
  {
    canonical_name: 'Aboyne Croquet Club',
    country: 'CA', region: 'ON', city: 'Elora',
    address_line1: '74 David St East', postal_code: 'N0B 1S0',
    contact_name: 'Brian Cumming',
    email: 'b.w.cumming@gmail.com',
    court_count: 2,
    notes: 'Play Mon/Wed 6pm–10:30pm; guests welcome, no fee. One full court + one 7/8 court.',
  },
  {
    canonical_name: 'Royal St. Catharines Croquet Club',
    short_name: 'RSCC',
    country: 'CA', region: 'ON', city: 'St. Catharines',
    contact_name: 'Chris Loat',
    phone: '(905) 685-6939',
    email: 'chrisloat@bell.net',
    court_count: 2,
    notes: '8 members; play anytime; guests welcome',
  },
  {
    canonical_name: 'Northern Lights Croquet Club',
    country: 'CA', region: 'ON', city: 'Stoney Creek',
    address_line1: '30 Cope Lane', postal_code: 'L8E 5C1',
    contact_name: 'Michael Schwenger',
    phone: '(905) 643-4545',
    email: 'michael@schwengers.com',
    court_count: 1,
    notes: 'Private; 14 members. Can configure as 2 × ¾ courts.',
  },
  {
    canonical_name: 'North Toronto Croquet Club',
    short_name: 'NTCC',
    country: 'CA', region: 'ON', city: 'Toronto',
    address_line1: '200 Lytton Blvd', postal_code: 'M4R 1L4',
    contact_name: 'John Miles',
    email: 'ntcroquet@bell.net',
    website: 'https://northtorontocroquet.ca',
    court_count: 2,
    notes: 'Over 50 members; play Tue evenings 6:00–8:30, Fri/Sun afternoons 1:00–3:30; guests welcome',
  },
  {
    canonical_name: 'Toronto Cricket Skating and Curling Club',
    short_name: 'TCSCC',
    country: 'CA', region: 'ON', city: 'Toronto',
    address_line1: '141 Wilson Ave', postal_code: 'M5M 3A3',
    contact_name: 'Graeme McCarrel',
    phone: '(416) 487-4581',
    email: 'gmccarrel@torontocricketclub.com',
    website: 'https://torontocricketclub.com',
    court_count: 5,
    notes: '75+ members; 4 full size + 1 tournament court; guests by invitation',
  },
  {
    canonical_name: 'Lawrence Park Lawn Bowling and Croquet Club',
    short_name: 'Lawrence Park CC',
    country: 'CA', region: 'ON', city: 'Toronto',
    address_line1: '61 Alexander Muir Gardens', postal_code: 'M4N 1H1',
    contact_name: 'Gregg Hannah',
    phone: '(416) 488-4244',
    email: 'Lawrenceparkclub1@gmail.com',
    website: 'https://lawrenceparkclub.ca',
  },
  {
    canonical_name: 'Kew Beach Lawn Bowling Club',
    short_name: 'Kew Beach',
    country: 'CA', region: 'ON', city: 'Toronto',
    address_line1: '12 Lee Ave', postal_code: 'M4E 2N9',
    contact_name: 'Don Short',
    phone: '416-483-2800',
    email: 'croquetguy@gmail.com',
    notes: 'Play Wed 7:30pm, Sat 10am; ideal for novice and intermediate players; first-time players welcome, no charge',
  },
  {
    canonical_name: 'Muskoka Lawn Bowling and Croquet Club',
    country: 'CA', region: 'ON', city: 'Bracebridge',
    address_line1: '1036 South Monck Drive', postal_code: 'P1L 1W8',
    contact_name: 'Sally Mills',
    phone: '(705) 646-0086',
    email: 'office@muskokabowls.ca',
    website: 'https://muskokabowls.ca',
    notes: 'Play Sat afternoon through Sun evening (from July)',
  },
  {
    canonical_name: 'Dorchester Golf Croquet Club',
    country: 'CA', region: 'ON', city: 'Dorchester',
    address_line1: '2429 Dorchester Road',
    contact_name: 'Malcolm Cromarty',
    phone: '(519) 268-0923',
    email: 'MalcolmCromarty@hotmail.com',
    court_count: 1,
    notes: 'Guests welcome with notice, no fee',
  },
  {
    canonical_name: 'Collingwood Croquet Club',
    country: 'CA', region: 'ON', city: 'Collingwood',
    address_line1: '45 Paterson Street', postal_code: 'L9Y 3N2',
    contact_name: 'Evan White',
    phone: '705-888-3314',
    email: 'ewhite1934@gmail.com',
    website: 'https://collingwoodcroquetclub.com',
  },

  // ── Quebec ────────────────────────────────────────────────────────────────
  {
    canonical_name: 'Mount Royal Croquet Club',
    short_name: 'MRCC',
    country: 'CA', region: 'QC', city: 'Mont-Royal',
    address_line1: '1620 Graham Blvd', postal_code: 'H3P 3N6',
    contact_name: 'Linda Kemerer',
    phone: '(514) 739-5761',
    email: 'lindakemerer@gmail.com',
    court_count: 1,
    notes: '25 members; daily play plus Wed 7–10:30pm; free beginner clinics; guests welcome, no fee',
  },

  // ── British Columbia ──────────────────────────────────────────────────────
  {
    canonical_name: 'Abbotsford Lawn Bowling and Croquet Club',
    short_name: 'Abbotsford CC',
    country: 'CA', region: 'BC', city: 'Abbotsford',
    address_line1: 'Mill Lake Park', postal_code: 'V2S 4S5',
    contact_name: 'Michael Kernaghan',
    phone: '(604) 615-9138',
    email: 'michael.kernaghan@gmail.com',
    website: 'https://abbotsfordcroquet.com',
    court_count: 1,
    notes: '~6 croquet members; play Tue/Thu evenings; monthly Sat tournaments; guests welcome',
  },
  {
    canonical_name: 'Happy Valley Croquet Club',
    country: 'CA', region: 'BC', city: 'Victoria',
    address_line1: '3505 Happy Valley Road', postal_code: 'V9C 2Y2',
    contact_name: 'Michael Dowling',
    phone: '250-419-2065',
    email: 'michael@happyvalleylavender.com',
    website: 'https://happyvalleylavender.com/croquet.php',
    court_count: 1,
    notes: 'Private; 8 members; daily play 10am; guests welcome with notice',
  },
  {
    canonical_name: 'Canadian Pacific Lawn Bowling and Croquet Club',
    short_name: 'CP Lawn Bowling',
    country: 'CA', region: 'BC', city: 'Victoria',
    address_line1: '720 Belleville St', postal_code: 'V8W 1A3',
    contact_name: 'Pierre Dunn',
    phone: '(778) 265-0888',
    email: 'breakrunner@vancroquet.com',
    website: 'https://downtownlawnbowling.ca',
    court_count: 1,
    notes: '~20 croquet members; play Fri/Sun; guests welcome',
  },
  {
    canonical_name: 'Oak Bay Lawn Bowling Club',
    country: 'CA', region: 'BC', city: 'Victoria',
    address_line1: '2190 Harlow Drive',
    phone: '(250) 592-1823',
    email: 'bowlsoakbay@gmail.com',
    website: 'https://bowlsoakbay.ca',
  },
  {
    canonical_name: 'Victoria Bowling and Croquet Club',
    short_name: 'Victoria B&CC',
    country: 'CA', region: 'BC', city: 'Victoria',
    address_line1: '160 Nursery Road',
    address_line2: 'PO Box 23011, RPO Cook Street',
    postal_code: 'V8V 4Z8',
    phone: '250-383-5851',
    email: 'victoriabowlsandcroquetclub@gmail.com',
  },
  {
    canonical_name: 'Victoria West Lawn Bowling Club',
    country: 'CA', region: 'BC', city: 'Victoria',
    address_line1: '95 Bay St', postal_code: 'V9A 6X9',
    phone: '250-382-0751',
    website: 'https://vicwestbowls.ca',
  },
]

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const SOURCE_URL = 'https://croquet.ca/affiliated-clubs.html'
  const now = new Date().toISOString()

  let inserted = 0
  let updated  = 0
  const errors: string[] = []

  for (const club of CANADA_CLUBS) {
    const payload = {
      ...club,
      verified:        true,
      source:          'scraped',
      source_url:      SOURCE_URL,
      last_scraped_at: now,
    }

    // Upsert on canonical_name — safe because names are unique per country
    const { data: existing } = await supabase
      .from('venues')
      .select('id')
      .eq('canonical_name', club.canonical_name)
      .eq('country', 'CA')
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('venues')
        .update({ ...payload })
        .eq('id', existing.id)
      if (error) errors.push(`${club.canonical_name}: ${error.message}`)
      else updated++
    } else {
      const { error } = await supabase
        .from('venues')
        .insert(payload)
      if (error) errors.push(`${club.canonical_name}: ${error.message}`)
      else inserted++
    }
  }

  // Seed aliases for well-known shorthand names
  const aliases: { name: string; alias: string }[] = [
    { name: 'North Toronto Croquet Club',              alias: 'NTCC' },
    { name: 'North Toronto Croquet Club',              alias: 'North Toronto' },
    { name: 'Toronto Cricket Skating and Curling Club', alias: 'TCSCC' },
    { name: 'Toronto Cricket Skating and Curling Club', alias: 'Toronto Cricket' },
    { name: 'Bayfield International Croquet Club',     alias: 'BICC' },
    { name: 'Bayfield International Croquet Club',     alias: 'Bayfield' },
    { name: 'Mount Royal Croquet Club',                alias: 'MRCC' },
    { name: 'Mount Royal Croquet Club',                alias: 'Mount Royal' },
    { name: 'Abbotsford Lawn Bowling and Croquet Club', alias: 'Abbotsford Croquet' },
  ]

  for (const { name, alias } of aliases) {
    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('canonical_name', name)
      .maybeSingle()
    if (!venue) continue
    await supabase
      .from('venue_aliases')
      .upsert({ venue_id: venue.id, alias }, { onConflict: 'alias', ignoreDuplicates: true })
  }

  return NextResponse.json({
    ok: true,
    country: 'CA',
    source: SOURCE_URL,
    inserted,
    updated,
    total: CANADA_CLUBS.length,
    errors: errors.length ? errors : undefined,
  })
}
