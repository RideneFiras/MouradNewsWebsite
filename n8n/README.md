# Email → article automation (n8n)

The journalist emails an article (text + pictures) to a dedicated Gmail address. Within a
minute it is a **draft** on the site, and Firas gets an email with the summary, the proposed
Facebook post and a button. He chooses **Publish + Facebook**, **Publish on the site only**
or **Keep as draft** (and can edit the Facebook text in the form). Nothing goes public
without that click.

```
Gmail (new email from the journalist, polled every minute)
  → Prepare email          check the sender (+ Gmail DKIM/DMARC), collect text and pictures
  → Make draft (publisher) GPT (or Claude) writes the spec with the /publish-article rules,
                           check + fidelity ("word for word"), saves the DRAFT,
                           writes the Facebook teaser
  → Ask Firas              approval email + form (waits up to 7 days)
  → Publish (publisher)    status → published, site cache refreshed
  → Post on Facebook       Graph API /{page-id}/feed (message + link)
  → Email: result          public link + Facebook result
```

Files here:

| File | What it is |
|---|---|
| `elborj-email-to-article.workflow.json` | The workflow, to import in n8n |
| `publisher/server.ts` | Private service n8n calls (`/ingest`, `/publish`) |
| `publisher/core.ts` | The work: reuses `scripts/publish-article.ts` and reads `.claude/skills/publish-article/SKILL.md` at runtime, so the rules stay in one place |
| `publisher/llm.ts` | The model: `LLM_PROVIDER=openai` (default, `OPENAI_MODEL`) or `anthropic` (`CLAUDE_MODEL`) |
| `publisher/try.ts` | Local test on a `posts/<n>` folder, saves nothing: `pnpm -s publisher:try posts/10` |
| `publisher/prompts.ts` | What changes when nobody is in the chat, and Firas's Facebook post rules |
| `publisher/Dockerfile`, `docker-compose.yml`, `Caddyfile` | n8n + publisher + HTTPS on the Oracle server |
| `.env.example` | The secrets the server needs (copy to `n8n/.env`, never commit it) |

The publisher has **no public port**: only n8n reaches it (`http://publisher:8787`), with a
bearer token. The Supabase secret key and the Claude API key live only in `n8n/.env` on the
server.

## 0. Test locally first (nothing is saved)

Add `OPENAI_API_KEY=…` to `.env.local`, then:

```bash
pnpm -s publisher:try --models        # which GPT models this key can use
OPENAI_MODEL=<one of them> pnpm -s publisher:try posts/10
```

It treats the folder like an email (`post.txt` / `post` / `posts` = the email body, pictures =
attachments), prints what the approval email would contain (spec summary, typo fixes, skipped
lines, notes, the word-for-word result, the Facebook text) and an HTML preview path. Compare
with the drafts made by hand for posts/8, 9, 10. Choose the model, then put it in `n8n/.env`.

## 1. Server

Follow the Oracle steps (account, Ubuntu 24.04 A1 instance, ports 80/443 in the security list
and in `iptables`, DuckDNS name, Docker). Then, instead of the stand-alone n8n compose file,
use the one in this folder:

```bash
# on the server: get the code (the repository is public; no secrets are in it)
git clone https://github.com/RideneFiras/MouradNewsWebsite.git ~/elborj
cd ~/elborj

cp n8n/.env.example n8n/.env
nano n8n/.env                         # fill in every value (see the comments)
chmod 600 n8n/.env

docker compose -f n8n/docker-compose.yml --env-file n8n/.env up -d --build
docker compose -f n8n/docker-compose.yml logs -f caddy      # wait for the certificate, Ctrl+C
```

Open `https://<your-name>.duckdns.org` and create the n8n owner account.

**Updating** (after a `git push` that changes the rules or the publisher):
```bash
cd ~/elborj && git pull && docker compose -f n8n/docker-compose.yml --env-file n8n/.env up -d --build
```

## 2. Credentials in n8n (Credentials → Add)

1. **Gmail OAuth2**: the Gmail account that *receives* the articles (e.g. a new
   `elborj.articles@gmail.com`). The approval emails are sent from it too.
   - Google Cloud Console → new project → enable **Gmail API** → OAuth consent screen
     (External) → add your address as test user → Credentials → OAuth client ID (Web) →
     redirect URI `https://<your-name>.duckdns.org/rest/oauth2-credential/callback`.
   - Paste client ID/secret in n8n, **Sign in with Google**.
   - Set the consent screen to **In production** (otherwise Google expires the login every
     7 days). Google then shows "unverified app" when you sign in: Advanced → continue. Fine for
     your own account.
2. **Header Auth** named `Publisher`: Name `Authorization`, Value `Bearer <PUBLISHER_TOKEN from n8n/.env>`.
3. **Query Auth** named `Facebook Page token`: Name `access_token`, Value = a Page access token:
   - developers.facebook.com → My apps → Create app (type Business) → add the El Borj Page.
   - Graph API Explorer → your app → User token with `pages_show_list`,
     `pages_read_engagement`, `pages_manage_posts` → Generate.
   - Exchange it for a long-lived user token (Access Token Debugger → Extend), then in the
     Explorer call `GET /me/accounts`: copy the Page's `access_token` (it does not expire
     when it comes from a long-lived user token) and its `id` (the Page id).
   - Switch the app to **Live** (it needs a privacy policy URL: use the site's privacy page).
     Posts made while the app is in Development mode may be visible only to you: after the
     first real post, check it from a logged-out browser.

## 3. Import the workflow

n8n → Workflows → Import from file → `elborj-email-to-article.workflow.json`. Then:

- **New email from the journalist**: choose the Gmail credential; set **Sender** to the
  journalist's address.
- **Prepare email**: edit the `SETTINGS` block at the top: `approver_email`,
  `allowed_senders` (same address), `facebook_page_id`.
- **Make draft (publisher)** and **Publish (publisher)**: credential `Publisher`.
- **Post on Facebook**: credential `Facebook Page token`.
- **Ask Firas** and the four **Email: …** nodes: the Gmail credential.
- Save, then switch the workflow **Active**.

## 4. Test

1. From the journalist's address, send a short real text with one picture.
2. Within ~2 minutes: an approval email. Open the draft link: check text, pictures, section.
3. Choose **Keep as draft** the first time. Then publish from the admin or with a second test.
4. Executions (left menu) shows every step; the publisher's log:
   `docker compose -f n8n/docker-compose.yml logs --tail 100 publisher`.

## How it decides, and the limits

- Same rules as `/publish-article` (word for word, typo fixes listed, draft only, unsigned,
  calendar dates only from the text). If `fidelity` fails, Claude gets the error and retries
  (3 attempts); after that Firas gets an error email and nothing is saved.
- Lines that are not article text (a section name line, «صباح الخير», a signature) are left out
  and **listed** in the approval email. If the title is only in the subject, the email says so.
- No title or not an article → no draft, Firas gets Claude's question by email.
- The same email is never turned into two drafts (the publisher remembers each Gmail message id).
- New tags are never created automatically: they are proposed in the email.
- HEIC pictures (iPhone) can't be read: the email says so. Ask for JPEG (most phones send JPEG
  by email anyway).
- PDF attachments are ignored (only pictures).
- Cost: one model call for the spec (+ up to 2 retries when fidelity fails) and one for the
  Facebook text per article, on your OpenAI credits (or Anthropic with `LLM_PROVIDER=anthropic`).
