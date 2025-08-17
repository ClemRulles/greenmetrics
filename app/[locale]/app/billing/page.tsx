import { locales } from '@/i18n';
import en from '@/public/locales/en/billing.json';
import fr from '@/public/locales/fr/billing.json';
import { loadEntitlementsForOrg, loadUsageForOrg } from '@/lib/billing/data';
import { deriveStatus } from '@/lib/billing/ui';
import { StatBar } from './components/StatBar';
import { Banner } from './components/Banner';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale = locales.includes(locale as (typeof locales)[number]) ? locale : 'en';
  const dict = resolvedLocale === 'fr' ? fr : en;
  const t = (k: string): string => {
    const keys = k.split('.');
    let value: unknown = dict;
    for (const key of keys) {
      if (typeof value === 'object' && value !== null && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return k; // Return key if not found
      }
    }
    return typeof value === 'string' ? value : k;
  };

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // In your middleware we already guard, but keep a server guard in case
    throw new Error('Unauthorized');
  }

  // Resolve viewer's default org (simple heuristic; adapt if you support switching)
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true }
  });
  if (!membership?.organizationId) throw new Error('No organization');

  const [ents, usage] = await Promise.all([
    loadEntitlementsForOrg(membership.organizationId),
    loadUsageForOrg(membership.organizationId)
  ]);

  const status = deriveStatus(ents.isFrozen, ents.graceUntil);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {t('title')}
      </h1>
      
      <Banner 
        status={status} 
        until={ents.graceUntil} 
        translations={{
          frozenTitle: t('banner.frozenTitle'),
          graceTitle: t('banner.graceTitle'),
          frozen: t('banner.frozen'),
          grace: t('banner.grace'),
          updatePayment: t('banner.updatePayment')
        }}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>{t('currentPlan')}</CardTitle>
          <CardContent className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              {t(`plan.${ents.plan.toLowerCase()}`)}
            </p>
            
            <div className="space-y-2">
              <form action="/api/billing/checkout" method="post">
                <input type="hidden" name="plan" value="PRO" />
                <Button type="submit" className="w-full">
                  {t('upgradeToPro')}
                </Button>
              </form>
              
              <form action="/api/billing/portal" method="post">
                <Button variant="outline" type="submit" className="w-full">
                  {t('openPortal')}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle>{t('usage')}</CardTitle>
          <CardContent className="space-y-4">
            <StatBar label={t('usageReports')} used={usage.reports.used} max={usage.reports.max} />
            <StatBar label={t('usageExports')} used={usage.exports.used} max={usage.exports.max} />
            <StatBar label={t('usageApi')} used={usage.api.used} max={usage.api.max} />
            <StatBar label={t('usageStorage')} used={usage.storage.used} max={usage.storage.max} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
