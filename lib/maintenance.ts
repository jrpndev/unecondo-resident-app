import { api } from './api';

export interface MaintenanceStatus {
  maintenanceMode: boolean;
  maintenanceMsg: string | null;
}

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const res = await api.get('/settings/maintenance');
  // endpoint retorna o objeto direto (sem wrapper data)
  const body = res.data;
  return {
    maintenanceMode: body.maintenanceMode ?? false,
    maintenanceMsg:  body.maintenanceMsg  ?? null,
  };
}
