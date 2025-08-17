import { NextResponse } from 'next/server'
import { getDict } from '@/i18n'

export async function GET(request: Request, { params }: { params: { locale: string } }) {
  const locale = params.locale || 'en'
  const dict = await getDict(locale, 'common')
  const title = dict.landing?.headline || 'GreenMetrics'
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='#e6f0ff'/><stop offset='1' stop-color='#e6fff2'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, system-ui, Arial' font-size='48' fill='#003366'>${title}</text></svg>`
  return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
}
