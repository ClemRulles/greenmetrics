export function inviteEmailEN(params: { orgName: string; acceptUrl: string; role: string }) {
  return {
    subject: `You're invited to ${params.orgName} on GreenMetrics`,
    text: `Hello,

You've been invited to join ${params.orgName} on GreenMetrics as ${params.role}.
Click to accept: ${params.acceptUrl}

If you didn't expect this, you can ignore this email.

— GreenMetrics`
  };
}
