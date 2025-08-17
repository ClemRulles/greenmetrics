import Link from 'next/link';

export const dynamic = 'force-static';

export default function Smoke() {
  return (
    <main style={{padding:'2rem', fontFamily:'system-ui, sans-serif'}}>
      <h1>✅ UI Smoke Test</h1>
      <p>If you see this, rendering works.</p>
      <ul>
        <li>i18n paths: <code>/en/smoke</code>, <code>/fr/smoke</code></li>
        <li>Try: <Link href="/en" prefetch={false}>/en</Link> · <Link href="/fr" prefetch={false}>/fr</Link></li>
      </ul>
    </main>
  );
}
