import Constants from 'expo-constants';

export interface VersionInfo {
  minVersion: string;
  downloadUrl: string;
}

function parseVersion(v: string): number[] {
  return v.split('.').map((n) => parseInt(n, 10) || 0);
}

// Returns true if `a` is older than `b`
function isOlderThan(a: string, b: string): boolean {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return true;
    if (na > nb) return false;
  }
  return false;
}

export function getCurrentVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

export async function checkAppVersion(): Promise<{ outdated: boolean; downloadUrl: string }> {
  try {
    const res = await fetch('https://unecondo.online/app-version.json', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return { outdated: false, downloadUrl: '' };
    const info: VersionInfo = await res.json();
    const outdated = isOlderThan(getCurrentVersion(), info.minVersion);
    return { outdated, downloadUrl: info.downloadUrl };
  } catch {
    return { outdated: false, downloadUrl: '' };
  }
}
