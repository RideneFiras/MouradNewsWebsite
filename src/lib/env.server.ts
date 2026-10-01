import 'server-only';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing server environment variable ${name} (see .env.example)`);
  return v;
}

export const serverEnv = {
  serviceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  revalidateSecret: () => required('REVALIDATE_SECRET'),
  trackerSecret: () => required('TRACKER_HMAC_SECRET'),
};
