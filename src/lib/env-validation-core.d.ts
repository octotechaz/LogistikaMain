export const LOOPBACK: "127.0.0.1";
export const OCTO_ADMIN_PORT: 3005;
export const BACKEND_PORT: 4001;

export function isNgrokHostname(host: string | null | undefined): boolean;
export function isNgrokTunnelMode(
  env?: Partial<Record<string, string | undefined>>
): boolean;
