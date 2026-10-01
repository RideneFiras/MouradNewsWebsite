export type CampaignStatus = 'upcoming' | 'running' | 'ended' | 'paused';

export function campaignStatus(c: { is_active: boolean; starts_at: string; ends_at: string | null }, now: number): CampaignStatus {
  if (!c.is_active) return 'paused';
  if (Date.parse(c.starts_at) > now) return 'upcoming';
  if (c.ends_at && Date.parse(c.ends_at) <= now) return 'ended';
  return 'running';
}

/** ISO instant → "YYYY-MM-DDTHH:MM" in Tunis time (UTC+1, no DST) for datetime-local inputs. */
export function toTunisLocal(iso: string | null): string {
  if (!iso) return '';
  return new Date(Date.parse(iso) + 3600_000).toISOString().slice(0, 16);
}
