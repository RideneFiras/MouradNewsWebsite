# Backups

The Supabase **free plan keeps no backups**. If the project were deleted or its data damaged,
the articles, pictures and statistics would be lost. So the site backs itself up:

- **Every Sunday at 04:00 (Tunis)**, the GitHub workflow `.github/workflows/backup.yml` copies
  every table in `public` (as JSON) and every file in the `media` bucket, encrypts the copy
  with AES-256 and keeps it **90 days** (GitHub → repository → Actions → Backup → a run →
  Artifacts). Run it any time with **Run workflow**.
- The repository is public, so the copy is **encrypted**: only someone with the passphrase can
  open it. Without the passphrase the backups are useless, so **keep the passphrase somewhere
  safe outside GitHub** (a password manager, or written down at home).
- On a laptop: `pnpm backup` writes an unencrypted copy to `backups/<date>/` (git-ignored).
  Don't share or commit it: it contains contact-form messages and statistics.

What's in a copy: `tables/<table>.json` (all rows), `media/…` (all pictures, same paths as in
the bucket), `manifest.json` (row counts, date). Left out: `analytics_salts` (a new salt is
made on restore), Supabase Auth users (staff are invited again).

## Opening a backup

1. Download the artifact (a `.zip` containing `elborj-backup-YYYY-MM-DD.tgz.gpg`) and unzip it.
2. `gpg --decrypt elborj-backup-YYYY-MM-DD.tgz.gpg > backup.tgz` (asks for the passphrase)
3. `mkdir backup && tar xzf backup.tgz -C backup`

## Restoring into a new Supabase project (outline)

1. Create the project, then run `supabase/ALL_MIGRATIONS.sql` and `supabase/seed.sql` in its
   SQL editor (APPLY.md steps 1–3).
2. Invite the staff again (Team screen or APPLY.md), so `profiles` rows exist with their new ids.
3. Upload `media/` to the `media` bucket with the same paths
   (`npx supabase storage cp -r backup/media ss:///media --experimental`, or the dashboard).
4. Insert the tables in the order of `TABLES` in `scripts/backup.ts` (parents first), replacing
   seeded rows (`categories`, `site_settings`, `pages`…) by the backed-up ones. Old profile ids
   in `created_by`/`uploaded_by`/`article_authors` must be mapped to the new staff ids.
   This step is a one-off script to write when needed (Claude Code can do it from this outline).
5. Point the site at the new project (`wrangler.jsonc` vars, secrets, `.env.local`), deploy,
   and press «إعادة توليد الذاكرة المؤقتة».
