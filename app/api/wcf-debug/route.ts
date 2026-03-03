import { NextResponse } from 'next/server'

const WCF_URL = 'https://rank.worldcroquet.org/gcrankdg/rank_list.php?year=current&games=0&grade=1200&country=World&rank_order=dg&prefer_name=true&women_only=false&show_state=no_state&show_c2_only=false&show_wc=show_wc_no&age_related=all'

export async function GET() {
  const response = await fetch(WCF_URL)
  const html = await response.text()
  const snippet = html.substring(0, 2000)
  return NextResponse.json({ length: html.length, snippet })
}
