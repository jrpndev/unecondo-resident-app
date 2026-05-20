import { api } from './api';

export type CondoStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'PENDING_PAYMENT' | 'TRIAL_EXPIRED';

export interface CondoStatusResult {
  id: string;
  name: string;
  status: CondoStatus;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  maxUnits: number;
  currentUnits: number;
}

export async function getCondoStatus(condoId: string): Promise<CondoStatusResult> {
  const res = await api.get(`/billing/status/${condoId}`);
  return res.data.data ?? res.data;
}

export function isCondoBlocked(status: CondoStatus): boolean {
  return status === 'SUSPENDED' || status === 'TRIAL_EXPIRED' || status === 'PENDING_PAYMENT';
}

export function condoBlockedMessage(status: CondoStatus, name: string): string {
  switch (status) {
    case 'SUSPENDED':
      return `O condomínio "${name}" está suspenso por inadimplência.\n\nContate o síndico ou administrador para regularizar o pagamento.`;
    case 'TRIAL_EXPIRED':
      return `O período de teste do condomínio "${name}" encerrou.\n\nContate o síndico para contratar um plano.`;
    case 'PENDING_PAYMENT':
      return `O pagamento do condomínio "${name}" ainda não foi confirmado.\n\nAguarde a confirmação do PIX ou contate o administrador.`;
    default:
      return 'Acesso ao condomínio indisponível no momento.';
  }
}
