import { NextResponse } from 'next/server';
import { ResolveQuery } from '@/lib/validators/factors';
import { resolveWithOverrides } from '@/lib/factors/resolve';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = Object.fromEntries(url.searchParams.entries());
  const parsed = ResolveQuery.safeParse(q);
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 422 });
  }

  const { kind, date, geo, orgId } = parsed.data;
  
  try {
    const resolved = await resolveWithOverrides({ 
      orgId: orgId, 
      kind, 
      date: new Date(date), 
      fallbackGeo: geo 
    });
    return NextResponse.json({ data: resolved }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'FACTOR_NOT_FOUND') {
      return NextResponse.json({ error: 'FACTOR_NOT_FOUND' }, { status: 404 });
    }
    throw error;
  }
}
