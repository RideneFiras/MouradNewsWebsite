# Launch checklist — قائمة ما قبل الإطلاق

Tick these in order. Everything in "In the admin" is done from `/ar/admin`, no code.

## 1. Technical (Firas)

- [ ] Database set up with `supabase/APPLY.md` (migrations, seed, admin account, keys, step 8 instant refresh).
- [ ] Site deployed with `docs/DEPLOY.md`; `SITE_URL` is the final domain; Supabase Auth URLs updated.
- [ ] Custom domain attached to the Worker, HTTPS works, `https://your-domain.tn/` opens `/ar`.
- [ ] Demo content removed: run `supabase/demo-clear.sql` in the Supabase SQL editor (removes every `[تجريبي]` / `[Démo]` article, the demo authors and demo photos).
- [ ] Backups: `scripts/backup.sh` run once **and restored once** into a scratch Supabase project.
- [ ] Lighthouse (Chrome DevTools → Lighthouse → Mobile) on the home page and one article on the real domain: Performance ≥ 90, Accessibility ≥ 95, SEO 100.
- [ ] `https://your-domain.tn/robots.txt`, `/sitemap.xml`, `/news-sitemap.xml`, `/ar/rss.xml` open correctly.
- [ ] Optional: Cloudflare rate-limiting rule and Bot Fight Mode (DEPLOY.md §6).

## 2. In the admin (the editor-in-chief)

- [ ] **الإعدادات**: name of the paper, tagline, logo (or keep the calligraphic text nameplate), favicon, default share image, masthead "ears", social links, Hijri date on/off.
- [ ] **الإعدادات → البيانات القانونية**: director, editor-in-chief, address, phone, e-mails (printed in the footer).
- [ ] **الصفحات**: write and publish, at least in Arabic: «من نحن» (about), «الميثاق التحريري» (charter), «اتصل بنا» (contact), «أعلن معنا» (media kit text), «سياسة الخصوصية» (privacy — the seeded text is a draft to review, ideally with a lawyer), «شروط الاستخدام» (legal notice / terms).
- [ ] **الأقسام**, **القوائم**, **الصفحة الرئيسية**: check the sections, footer links and homepage order.
- [ ] **الفريق**: invite correspondents with the right role (كاتب / محرر).
- [ ] At least **15–20 real articles** published across the sections before applying to AdSense.
- [ ] **ملف المعلنين**: choose the numbers shown, period, rounding, ad formats and contact.

## 3. Google and Facebook

- [ ] **Google Search Console**: add the domain (DNS verification in Cloudflare), submit `/sitemap.xml` and `/news-sitemap.xml`.
- [ ] **Google Publisher Center** (Google News): add the publication, link the site and sections.
- [ ] **GA4** (optional): create a property, paste the `G-…` ID in الإعدادات. The site's own statistics work without it.
- [ ] **AdSense** (after the pages and 15–20 articles above): apply with the domain; after approval paste the `ca-pub-…` ID and Google's ads.txt line in **الإشهار**, create manual ad units and copy their IDs into the slots you want, keep "Auto ads" off, and configure the consent message (Privacy & messaging → European regulations) in AdSense.
- [ ] **Facebook**: link the page in الإعدادات, check a shared article with the Facebook Sharing Debugger (title, image, description), enter the page numbers once in الإحصائيات → فيسبوك والشبكات.

## 4. To verify with a professional (not decided by the software)

See DECISIONS.md, "Owner to verify": whether an online publication must be declared in
Tunisia and what the legal masthead must contain (SNJT or a lawyer), personal-data
obligations under Loi organique n° 2004-63 (INPDP), and the final privacy policy text.

## 5. Training (about one hour, on his phone)

- [ ] Log in, write an article, add a photo from the camera, set the focal point, publish, share on WhatsApp from the success screen.
- [ ] Schedule an article and see it appear at the time.
- [ ] Review a correspondent's article: send back with a note, then publish.
- [ ] Add / rename / move a section; reorder the homepage.
- [ ] Read الإحصائيات (today, 7 days, top articles, sources); print the monthly report for a sponsor.
- [ ] Update the Facebook numbers once a month.
- [ ] Create a sponsor campaign, then print its report.
- [ ] Change his password (ملفي).
