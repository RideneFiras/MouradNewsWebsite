\ir 00_setup.sql
select tests.ok(public.normalize_ar('أَخْبارُ المَدِينَة') = 'اخبار المدينه', 'normalize_ar strips tashkeel and unifies alef/ta marbuta');
select tests.ok(public.normalize_ar('إسلام آمنة ٱلقرية') = 'اسلام امنه القريه', 'normalize_ar unifies hamza alef forms');
select tests.ok(public.normalize_ar('مُبـــاراة') = 'مباراه', 'normalize_ar strips tatweel');
select tests.ok(public.normalize_ar('مستشفى سؤال رئيس') = 'مستشفي سوال رييس', 'normalize_ar maps ى ؤ ئ');
select tests.ok(public.normalize_ar('Élève KÉLIBIA') = 'eleve kelibia', 'normalize_ar lowercases and unaccents Latin');
select tests.ok(public.estimate_reading_minutes('') = 1, 'reading time minimum 1');
select tests.ok(public.estimate_reading_minutes(repeat('كلمة ', 401)) = 3, 'reading time words/200 rounded up');
select tests.ok(public.slugify('Kélibia Côte') = 'kelibia-cote', 'slugify ascii');
select tests.ok(public.slugify('قليبية') = '', 'slugify returns empty for Arabic-only input');
select tests.ok(public.article_slug('النادي الأولمبي بقليبية يفوز 3-1') = 'النادي-الأولمبي-بقليبية-يفوز-3-1', 'article slug keeps Arabic');
select tests.ok(public.round_down_2sig(12345) = 12000, 'round down 12345');
select tests.ok(public.round_down_2sig(19999) = 19000, 'round down never rounds up');
select tests.ok(public.round_down_2sig(87) = 87, 'small numbers exact');
