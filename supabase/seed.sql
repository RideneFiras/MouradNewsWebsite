-- El Borj — base seed (run once, after the migrations)
-- Everything here is editable or removable later from the admin.
-- No personal data, no demo articles (see demo-seed.sql for those).

begin;

-- Helpers for static page bodies (Tiptap JSON + matching HTML). Lines starting
-- with "## " become sub-headings, the rest paragraphs.
create or replace function pg_temp.doc(paras text[]) returns jsonb language sql immutable as $$
  select jsonb_build_object('type', 'doc', 'content', coalesce(jsonb_agg(
    case when p like '## %' then
      jsonb_build_object('type', 'heading', 'attrs', jsonb_build_object('level', 2),
                         'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', substr(p, 4))))
    else
      jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p)))
    end order by ord), '[]'::jsonb))
  from unnest(paras) with ordinality as t(p, ord);
$$;
create or replace function pg_temp.html(paras text[]) returns text language sql immutable as $$
  select string_agg(
    case when p like '## %' then '<h2>' || replace(replace(replace(substr(p, 4), '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</h2>'
         else '<p>' || replace(replace(replace(p, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>' end, '' order by ord)
  from unnest(paras) with ordinality as t(p, ord);
$$;

-- ---------------------------------------------------------------------------
-- Site settings
insert into public.site_settings (key, value, is_public) values
  ('site_name', '{"ar": "البرج", "fr": "El Borj"}', true),
  ('tagline', '{"ar": "جريدة إلكترونية مستقلّة", "fr": "Journal électronique indépendant"}', true),
  ('logo', '{"media_id": null, "use_text_nameplate": true}', true),
  ('favicon_media_id', 'null', true),
  ('masthead_ears', '{"start": "latest", "end_ar": "قليبية · الوطن القبلي", "end_fr": "Kélibia · Cap Bon"}', true),
  ('legal_masthead', '{"director_ar": "مراد ريدان", "director_fr": "Mourad Ridene", "editor_in_chief_ar": "مراد ريدان", "editor_in_chief_fr": "Mourad Ridene", "address_ar": "", "address_fr": "", "phone": "", "email": "", "ads_email": "", "ads_phone": ""}', true),
  ('social_links', '{"facebook": "", "instagram": "", "youtube": "", "x": "", "whatsapp_channel": ""}', true),
  ('show_hijri_date', '{"enabled": true, "offset_days": 0}', true),
  ('breaking', '{"enabled": true, "default_hours": 6}', true),
  ('content_mixing', '{"fr_include_arabic_content": true, "ar_include_french_content": true}', true),
  ('ga4', '{"measurement_id": ""}', true),
  ('adsense', '{"client_id": "", "enabled": false}', true),
  ('ads_txt', '{"content": ""}', true),
  ('consent', '{"mode": "google_cmp", "custom_text_ar": "", "custom_text_fr": ""}', true),
  ('in_article_ads', '{"after_paragraphs": [3, 8], "min_paragraphs": 5}', true),
  ('analytics', '{"raw_retention_days": 60, "exclude_staff": true}', false),
  ('default_og_media_id', 'null', true),
  ('home_text_block', '{"text_ar": "", "text_fr": ""}', true),
  ('media_kit', '{
    "metrics": {"monthly_pageviews": true, "monthly_visitors": true, "engaged_time": true, "mobile_share": true,
                "geo": true, "top_sections": true, "facebook_followers": true, "articles_per_month": true},
    "period": "last_full_month",
    "rounding": "round_down",
    "statement_ar": "تُحتسب هذه الأرقام آليًا بأداة قياس خاصة بالموقع، ولا يمكن تعديلها يدويا. تُستثنى زيارات فريق التحرير وبرامج الروبوت.",
    "statement_fr": "Ces chiffres sont calculés automatiquement par l’outil de mesure du site et ne peuvent pas être modifiés à la main. Les visites de la rédaction et des robots sont exclues.",
    "contact_name": "", "contact_phone": "", "contact_email": "",
    "formats": [
      {"name_ar": "لافتة أعلى الصفحة الرئيسية", "name_fr": "Bannière en tête de la une", "description_ar": "تظهر تحت قائمة الأقسام في الصفحة الرئيسية", "description_fr": "Sous la barre des rubriques, page d’accueil", "size": "970×250 / 300×250", "price_ar": "", "price_fr": "", "visible": true},
      {"name_ar": "مربّع في عمود المقالات", "name_fr": "Pavé dans les articles", "description_ar": "في العمود الجانبي لكل المقالات", "description_fr": "Colonne latérale de tous les articles", "size": "300×250", "price_ar": "", "price_fr": "", "visible": true},
      {"name_ar": "محتوى برعاية", "name_fr": "Contenu sponsorisé", "description_ar": "مقال يحمل بوضوح عبارة «محتوى برعاية»", "description_fr": "Article clairement signalé « Contenu sponsorisé »", "size": "", "price_ar": "", "price_fr": "", "visible": true}
    ]
  }', true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Sections
insert into public.categories (slug, name_ar, name_fr, position, show_in_nav, is_active) values
  ('cap-bon', 'الوطن القبلي', 'Cap Bon', 1, true, true),
  ('national', 'وطنية', 'National', 2, true, true),
  ('volleyball', 'الكرة الطائرة', 'Volley-ball', 3, true, true),
  ('sport', 'رياضة', 'Sport', 4, true, true),
  ('culture', 'ثقافة', 'Culture', 5, true, true),
  ('society', 'مجتمع', 'Société', 6, true, true),
  ('economy', 'اقتصاد', 'Économie', 7, true, true),
  ('opinion', 'رأي', 'Opinions', 8, true, true),
  ('world', 'عالم', 'Monde', 9, false, false)
on conflict (slug) do nothing;

insert into public.categories (slug, name_ar, name_fr, position, show_in_nav, parent_id)
select v.slug, v.name_ar, v.name_fr, v.position, false, p.id
from (values
  ('football', 'كرة القدم', 'Football', 1, 'sport'),
  ('handball', 'كرة اليد', 'Handball', 2, 'sport'),
  ('basketball', 'كرة السلة', 'Basket-ball', 3, 'sport'),
  ('other-sports', 'رياضات أخرى', 'Autres sports', 4, 'sport'),
  ('theatre', 'مسرح', 'Théâtre', 1, 'culture'),
  ('music', 'موسيقى', 'Musique', 2, 'culture'),
  ('cinema', 'سينما', 'Cinéma', 3, 'culture'),
  ('books', 'كتب وأدب', 'Livres', 4, 'culture'),
  ('visual-arts', 'فنون تشكيلية', 'Arts plastiques', 5, 'culture'),
  ('heritage', 'تراث', 'Patrimoine', 6, 'culture')
) as v(slug, name_ar, name_fr, position, parent_slug)
join public.categories p on p.slug = v.parent_slug
on conflict (slug) do nothing;

update public.categories set description_ar = 'أخبار قليبية ونابل ومنزل تميم وقربة والحمامات وكامل ولاية نابل.',
                             description_fr = 'L’actualité de Kélibia, Nabeul, Menzel Temime, Korba, Hammamet et de tout le gouvernorat de Nabeul.'
where slug = 'cap-bon' and description_ar is null;
update public.categories set description_ar = 'البطولة الوطنية والكأس والمنتخبات، رجالا وسيدات.',
                             description_fr = 'Championnat, coupe et sélections, messieurs et dames.'
where slug = 'volleyball' and description_ar is null;

-- ---------------------------------------------------------------------------
-- Formats (genres)
insert into public.article_formats (slug, name_ar, name_fr, position, show_as_kicker, is_opinion) values
  ('news', 'خبر', 'Brève', 1, false, false),
  ('report', 'تقرير', 'Reportage', 2, true, false),
  ('reportage', 'روبورتاج', 'Reportage de terrain', 3, true, false),
  ('interview', 'حوار', 'Entretien', 4, true, false),
  ('opinion', 'رأي', 'Opinion', 5, true, true),
  ('column', 'عمود', 'Chronique', 6, true, true),
  ('analysis', 'تحليل', 'Analyse', 7, true, false),
  ('portrait', 'بورتريه', 'Portrait', 8, true, false),
  ('investigation', 'تحقيق', 'Enquête', 9, true, false),
  ('review', 'قراءة نقدية', 'Critique', 10, true, false),
  ('results', 'نتائج', 'Résultats', 11, true, false)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Place tags (clubs and people are added by the editor)
insert into public.tags (kind, slug, name_ar, name_fr) values
  ('place', 'kelibia', 'قليبية', 'Kélibia'),
  ('place', 'nabeul', 'نابل', 'Nabeul'),
  ('place', 'menzel-temime', 'منزل تميم', 'Menzel Temime'),
  ('place', 'korba', 'قربة', 'Korba'),
  ('place', 'hammamet', 'الحمامات', 'Hammamet'),
  ('place', 'menzel-bouzelfa', 'منزل بوزلفة', 'Menzel Bouzelfa'),
  ('place', 'tazarka', 'تازركة', 'Tazarka'),
  ('place', 'el-haouaria', 'الهوارية', 'El Haouaria')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Ad slots (all off until the owner turns them on)
insert into public.ad_slots (key, label_ar, label_fr, mode, sizes) values
  ('header_leaderboard', 'أعلى كل الصفحات', 'Haut de toutes les pages', 'off', '{"desktop":[970,90],"mobile":[320,100]}'),
  ('home_leaderboard', 'الصفحة الرئيسية — بعد الواجهة', 'Accueil — après la une', 'off', '{"desktop":[970,250],"mobile":[300,250]}'),
  ('home_mid', 'الصفحة الرئيسية — وسط الصفحة', 'Accueil — milieu de page', 'off', '{"desktop":[970,250],"mobile":[300,250]}'),
  ('sidebar_top', 'العمود الجانبي', 'Colonne latérale', 'off', '{"desktop":[300,250],"mobile":[300,250]}'),
  ('in_article_1', 'داخل المقال 1', 'Dans l’article 1', 'off', '{"desktop":[728,90],"mobile":[300,250]}'),
  ('in_article_2', 'داخل المقال 2', 'Dans l’article 2', 'off', '{"desktop":[728,90],"mobile":[300,250]}'),
  ('article_end', 'نهاية المقال', 'Fin d’article', 'off', '{"desktop":[728,90],"mobile":[300,250]}'),
  ('category_inline', 'صفحات الأقسام', 'Pages rubriques', 'off', '{"desktop":[728,90],"mobile":[300,250]}'),
  ('footer', 'أسفل الصفحة', 'Pied de page', 'off', '{"desktop":[728,90],"mobile":[320,100]}')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Homepage (shared by both interfaces; each can be changed separately later)
insert into public.homepage_sections (locale, type, title_ar, title_fr, config, position)
select 'both', v.type::public.homepage_section_type, v.title_ar, v.title_fr, v.config, v.position
from (values
  (1, 'breaking_ticker', null, null, '{}'::jsonb),
  (2, 'lead', null, null, '{"source": "featured_or_latest", "secondary_count": 3, "layout": "side_by_side"}'::jsonb),
  (3, 'latest_list', 'آخر الأخبار', 'Dernières infos', '{"count": 10}'::jsonb),
  (4, 'ad_slot', null, null, '{"ad_slot_key": "home_leaderboard"}'::jsonb),
  (5, 'category_block', null, null, jsonb_build_object('category_id', (select id from public.categories where slug = 'cap-bon'), 'count', 5, 'layout', 'one_big_four_list')),
  (6, 'category_block', null, null, jsonb_build_object('category_id', (select id from public.categories where slug = 'volleyball'), 'count', 5, 'layout', 'feature_plus_list')),
  (7, 'opinion', 'رأي', 'Opinions', '{"count": 4}'::jsonb),
  (8, 'category_block', null, null, jsonb_build_object('category_id', (select id from public.categories where slug = 'culture'), 'count', 4, 'layout', 'three_columns')),
  (9, 'most_read', 'الأكثر قراءة', 'Les plus lus', '{"window_days": 7, "count": 5}'::jsonb),
  (10, 'ad_slot', null, null, '{"ad_slot_key": "home_mid"}'::jsonb),
  (11, 'category_block', null, null, jsonb_build_object('category_id', (select id from public.categories where slug = 'sport'), 'count', 5, 'layout', 'one_big_four_list')),
  (12, 'category_block', null, null, jsonb_build_object('category_id', (select id from public.categories where slug = 'national'), 'count', 5, 'layout', 'list_only')),
  (13, 'category_block', null, null, jsonb_build_object('category_id', (select id from public.categories where slug = 'society'), 'count', 4, 'layout', 'one_big_four_list'))
) as v(position, type, title_ar, title_fr, config)
where not exists (select 1 from public.homepage_sections);

-- ---------------------------------------------------------------------------
-- Static pages: drafts with a sentence saying what goes there. The owner writes them.
insert into public.pages (slug, language, title, page_kind, show_in_footer, position, status, body_json, body_html)
select v.slug, v.lang::public.content_language, v.title, v.kind, true, v.position, 'draft', pg_temp.doc(v.body), pg_temp.html(v.body)
from (values
  ('about', 'ar', 'من نحن', 'about', 1, array['اكتب هنا تعريفا بالجريدة: من يصدرها، ومتى انطلقت، وما الذي تغطيه، ولماذا.', 'يمكن أن تضيف أسماء فريق التحرير والمراسلين وطريقة الاتصال بهم.']),
  ('charter', 'ar', 'الميثاق التحريري', 'charter', 2, array['اكتب هنا المبادئ التي تلتزم بها الجريدة: الدقة، والتحقق من المصادر، والفصل بين الخبر والرأي، والفصل بين التحرير والإشهار.', 'اذكر كيف تُعالج الأخطاء والتصويبات، وكيف يُوسَم المحتوى الممول.']),
  ('contact', 'ar', 'اتصل بنا', 'contact', 3, array['اكتب هنا جملة تدعو القراء إلى مراسلة الجريدة بخبر أو ملاحظة. يظهر نموذج الاتصال وعنوان الجريدة تحت هذا النص تلقائيا.']),
  ('advertise', 'ar', 'أعلن معنا', 'media_kit', 4, array['اكتب هنا تقديما للجريدة موجّها إلى المعلنين: من هم قراؤها، وما الذي يميزها في الوطن القبلي والكرة الطائرة.', 'تظهر الأرقام الحية وصيغ الإشهار تحت هذا النص تلقائيا.']),
  ('privacy', 'ar', 'سياسة الخصوصية', 'privacy', 5, array[
    'مسودة أولية يجب مراجعتها قبل النشر، ويُستحسن عرضها على مختص في القانون.',
    '## قياس الزيارات',
    'يستعمل الموقع أداة قياس خاصة به لا تضع أي ملف تعريف (cookie) ولا تخزن عنوان IP. لكل زيارة نحتفظ بالصفحة المزورة ومصدر الزيارة والبلد ونوع الجهاز، وبرمز مجهول يُحسب من عنوان IP ونوع المتصفح ومفتاح يتغيّر كل شهر ثم يُحذف، فلا يمكن الرجوع منه إلى شخص ولا الربط بين شهرين.',
    'تُحذف البيانات الخام بعد مدة محددة (60 يوما افتراضيا) ولا نحتفظ بعدها إلا بأرقام مجمّعة.',
    '## خدمات Google',
    'قد يستعمل الموقع Google Analytics وGoogle AdSense. تضع هذه الخدمات ملفات تعريف خاصة بها. يُطلب من زوار الاتحاد الأوروبي والمملكة المتحدة وسويسرا موافقتهم عبر رسالة Google. للاطلاع على سياسة Google: https://policies.google.com/privacy',
    '## نموذج الاتصال',
    'عندما تراسلنا نحتفظ باسمك وبريدك الإلكتروني ورسالتك لنتمكن من الرد عليك. تُحذف الرسائل المعالجة بعد 12 شهرا على الأكثر. يمكنك طلب حذف رسالتك في أي وقت عبر صفحة الاتصال.',
    '## الحسابات',
    'لا توجد حسابات للقراء. الحسابات الوحيدة هي حسابات فريق التحرير.',
    '## الإطار القانوني',
    'نعمل في إطار القانون الأساسي عدد 63 لسنة 2004 المتعلق بحماية المعطيات الشخصية، والهيئة الوطنية لحماية المعطيات الشخصية (INPDP) هي الجهة المرجعية.']),
  ('legal', 'ar', 'شروط الاستخدام', 'legal', 6, array['اكتب هنا البيانات القانونية للجريدة: اسم المدير المسؤول، والعنوان، وشروط إعادة نشر المقالات.']),
  ('about', 'fr', 'À propos', 'about', 1, array['Présentez ici le journal : qui le publie, depuis quand, ce qu’il couvre et pourquoi.', 'Vous pouvez ajouter l’équipe de rédaction, les correspondants et leurs contacts.']),
  ('charter', 'fr', 'Charte éditoriale', 'charter', 2, array['Décrivez ici les principes du journal : exactitude, vérification des sources, séparation de l’information et de l’opinion, séparation de la rédaction et de la publicité.', 'Expliquez comment les erreurs sont corrigées et comment le contenu sponsorisé est signalé.']),
  ('contact', 'fr', 'Contact', 'contact', 3, array['Écrivez ici une phrase invitant les lecteurs à contacter la rédaction. Le formulaire et les coordonnées s’affichent automatiquement en dessous.']),
  ('advertise', 'fr', 'Annoncer chez nous', 'media_kit', 4, array['Présentez ici le journal aux annonceurs : son lectorat et ce qui le distingue au Cap Bon et dans le volley-ball.', 'Les chiffres en direct et les formats publicitaires s’affichent automatiquement en dessous.']),
  ('privacy', 'fr', 'Politique de confidentialité', 'privacy', 5, array[
    'Brouillon à relire avant publication, idéalement avec un juriste.',
    '## Mesure d’audience',
    'Le site utilise son propre outil de mesure, sans cookie et sans enregistrement de l’adresse IP. Pour chaque visite, nous conservons la page vue, la source de la visite, le pays, le type d’appareil et un identifiant anonyme calculé à partir de l’adresse IP, du navigateur et d’une clé qui change chaque mois puis est supprimée : il est impossible de remonter à une personne ou de relier deux mois entre eux.',
    'Les données brutes sont supprimées après une durée limitée (60 jours par défaut) ; seuls des totaux agrégés sont conservés ensuite.',
    '## Services Google',
    'Le site peut utiliser Google Analytics et Google AdSense, qui déposent leurs propres cookies. Les visiteurs de l’Union européenne, du Royaume-Uni et de Suisse sont invités à donner leur consentement via le message de Google. Politique de Google : https://policies.google.com/privacy',
    '## Formulaire de contact',
    'Lorsque vous nous écrivez, nous conservons votre nom, votre adresse e-mail et votre message pour vous répondre. Les messages traités sont supprimés au plus tard après 12 mois. Vous pouvez demander leur suppression à tout moment via la page Contact.',
    '## Comptes',
    'Il n’y a pas de comptes lecteurs. Les seuls comptes sont ceux de la rédaction.',
    '## Cadre légal',
    'Nous appliquons la loi organique n° 2004-63 relative à la protection des données personnelles ; l’Instance nationale de protection des données personnelles (INPDP) est l’autorité de référence.']),
  ('legal', 'fr', 'Mentions légales', 'legal', 6, array['Indiquez ici les mentions légales du journal : directeur de la publication, adresse, conditions de reproduction des articles.'])
) as v(slug, lang, title, kind, position, body)
on conflict (language, slug) do nothing;

-- Link AR/FR versions of each page as translations of each other.
update public.pages p set translation_group_id = g.gid
from (select slug, gen_random_uuid() gid from public.pages where translation_group_id is null group by slug) g
where p.slug = g.slug and p.translation_group_id is null;

-- ---------------------------------------------------------------------------
-- Footer menu: static pages
insert into public.menu_items (menu, label_ar, label_fr, target_type, url, position)
select 'footer', v.label_ar, v.label_fr, 'url', v.url, v.position
from (values
  ('من نحن', 'À propos', '/p/about', 1),
  ('الميثاق التحريري', 'Charte éditoriale', '/p/charter', 2),
  ('اتصل بنا', 'Contact', '/contact', 3),
  ('أعلن معنا', 'Annoncer chez nous', '/advertise', 4),
  ('سياسة الخصوصية', 'Confidentialité', '/p/privacy', 5),
  ('شروط الاستخدام', 'Mentions légales', '/p/legal', 6)
) as v(label_ar, label_fr, url, position)
where not exists (select 1 from public.menu_items where menu = 'footer');

commit;
