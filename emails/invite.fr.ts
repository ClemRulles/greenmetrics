export function inviteEmailFR(params: { orgName: string; acceptUrl: string; role: string }) {
  return {
    subject: `Invitation à rejoindre ${params.orgName} sur GreenMetrics`,
    text: `Bonjour,

Vous avez été invité(e) à rejoindre ${params.orgName} sur GreenMetrics en tant que ${params.role}.
Cliquez pour accepter : ${params.acceptUrl}

Si vous n'attendiez pas cet email, vous pouvez l'ignorer.

— GreenMetrics`
  };
}
