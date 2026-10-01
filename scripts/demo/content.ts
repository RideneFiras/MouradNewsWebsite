// Demo content for supabase/demo-seed.sql. Every item is fictional and flagged demo.
// Clubs, festivals and people are invented; places are real towns of the Cap Bon.

export type Block =
  | string
  | { h2: string }
  | { quote: string }
  | { pull: string }
  | { list: string[] }
  | { table: string[][] }
  | { qa: [string, string] };

export interface DemoArticle {
  key: string;
  lang: 'ar' | 'fr';
  category: string;
  format: string;
  author: 'leila' | 'sofiene' | 'nadia';
  hoursAgo: number;
  title: string;
  subtitle?: string;
  location?: string;
  image?: string;
  tags?: string[];
  featured?: boolean;
  breaking?: boolean;
  sponsor?: string;
  correction?: string;
  translationOf?: string;
  extraCategories?: string[];
  body: Block[];
}

export const AUTHORS = {
  leila: { id: 'de000000-0000-4000-8000-000000000001', email: 'demo-leila@example.invalid', slug: 'demo-leila-ben-youssef', name_ar: 'ليلى بن يوسف', name_fr: 'Leïla Ben Youssef', title_ar: 'مراسلة نابل (حساب تجريبي)', title_fr: 'Correspondante à Nabeul (compte de démo)', bio_ar: 'حساب تجريبي لعرض صفحة الكاتب. يُحذف مع المحتوى التجريبي.', bio_fr: 'Compte de démonstration, supprimé avec le contenu de démo.' },
  sofiene: { id: 'de000000-0000-4000-8000-000000000002', email: 'demo-sofiene@example.invalid', slug: 'demo-sofiene-ayari', name_ar: 'سفيان العياري', name_fr: 'Sofiene Ayari', title_ar: 'محرر رياضي (حساب تجريبي)', title_fr: 'Journaliste sportif (compte de démo)', bio_ar: 'حساب تجريبي يغطي الكرة الطائرة والرياضات الجماعية.', bio_fr: 'Compte de démonstration : volley-ball et sports collectifs.' },
  nadia: { id: 'de000000-0000-4000-8000-000000000003', email: 'demo-nadia@example.invalid', slug: 'demo-nadia-karray', name_ar: 'نادية الكراي', name_fr: 'Nadia Karray', title_ar: 'صحفية ثقافية (حساب تجريبي)', title_fr: 'Journaliste culture (compte de démo)', bio_ar: 'حساب تجريبي يكتب بالعربية والفرنسية عن الثقافة.', bio_fr: 'Compte de démonstration, culture, en arabe et en français.' },
} as const;

const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb';
// Wikimedia only serves standard thumbnail widths (500, 960, 1280, …).
const wm = (path: string, file: string) => ({
  500: `${W}/${path}/${file}/500px-${file}`,
  960: `${W}/${path}/${file}/960px-${file}`,
  1280: `${W}/${path}/${file}/1280px-${file}`,
});

export const IMAGES: Record<string, { id: string; variants: Record<number, string>; width: number; height: number; credit: string; alt_ar: string; alt_fr: string; caption_ar: string; caption_fr: string; focal_x?: number; focal_y?: number }> = {
  fort: { id: 'de100000-0000-4000-8000-000000000001', variants: wm('9/93', 'Kelibia_fort_03.jpg'), width: 2048, height: 1536, credit: 'Wael Ghabara / Wikimedia Commons, CC BY-SA 3.0', alt_ar: 'أسوار حصن قليبية فوق التل المطل على البحر', alt_fr: 'Les remparts du fort de Kélibia sur la colline face à la mer', caption_ar: 'حصن قليبية', caption_fr: 'Le fort de Kélibia', focal_y: 0.4 },
  fortWall: { id: 'de100000-0000-4000-8000-000000000002', variants: wm('b/b9', 'Byzantine_Fortress_of_Kelibia_photo19_%D8%A7%D9%84%D8%AD%D8%B5%D9%86_%D8%A7%D9%84%D8%A8%D9%8A%D8%B2%D9%86%D8%B7%D9%8A_%D8%A8%D9%82%D9%84%D9%8A%D8%A8%D9%8A%D8%A9.jpg'), width: 2592, height: 1728, credit: 'Sami Mlouhi / Wikimedia Commons, CC BY-SA 4.0', alt_ar: 'جدار حجري قديم داخل الحصن البيزنطي بقليبية', alt_fr: 'Mur de pierre ancien à l’intérieur de la forteresse byzantine de Kélibia', caption_ar: 'داخل الحصن البيزنطي بقليبية', caption_fr: 'Dans la forteresse byzantine de Kélibia' },
  town: { id: 'de100000-0000-4000-8000-000000000003', variants: wm('6/6f', 'KELIBIA_01.JPG'), width: 3008, height: 2000, credit: 'Calips / Wikimedia Commons, CC BY 3.0', alt_ar: 'منظر عام لمدينة قليبية', alt_fr: 'Vue générale de Kélibia', caption_ar: 'قليبية', caption_fr: 'Kélibia' },
  beach: { id: 'de100000-0000-4000-8000-000000000004', variants: wm('0/04', 'Kelibia_beach.jpg'), width: 6016, height: 4016, credit: 'Benmahjoub Mohamed / Wikimedia Commons, CC BY-SA 4.0', alt_ar: 'شاطئ قليبية ومياه زرقاء صافية', alt_fr: 'La plage de Kélibia et son eau claire', caption_ar: 'شاطئ قليبية', caption_fr: 'La plage de Kélibia' },
  hammamet: { id: 'de100000-0000-4000-8000-000000000005', variants: wm('b/bd', 'Hammamet_Medina_R01.jpg'), width: 5622, height: 2600, credit: 'Marc Ryckaert (MJJR) / Wikimedia Commons, CC BY 3.0', alt_ar: 'أسوار المدينة العتيقة بالحمامات على البحر', alt_fr: 'Les remparts de la médina de Hammamet au bord de la mer', caption_ar: 'المدينة العتيقة بالحمامات', caption_fr: 'La médina de Hammamet', focal_x: 0.45 },
  door: { id: 'de100000-0000-4000-8000-000000000006', variants: wm('3/38', 'Portes_de_Kelibia_04.jpg'), width: 2541, height: 2327, credit: 'Fusi Sandro / Wikimedia Commons, CC BY-SA 4.0', alt_ar: 'باب خشبي تقليدي مزخرف في قليبية', alt_fr: 'Porte traditionnelle décorée à Kélibia', caption_ar: 'من أبواب قليبية', caption_fr: 'Une porte de Kélibia' },
};

// Fictional tags created by the demo (removed by demo-clear.sql).
export const DEMO_TAGS = [
  { slug: 'demo-club-menzel-temime', kind: 'club', name_ar: 'النادي الرياضي بمنزل تميم (تجريبي)', name_fr: 'Club sportif de Menzel Temime (démo)' },
  { slug: 'demo-club-haouaria', kind: 'club', name_ar: 'النجم الرياضي بالهوارية (تجريبي)', name_fr: 'Étoile sportive d’El Haouaria (démo)' },
  { slug: 'demo-league-volley', kind: 'competition', name_ar: 'البطولة الجهوية للكرة الطائرة (تجريبي)', name_fr: 'Championnat régional de volley-ball (démo)' },
  { slug: 'demo-theatre-days', kind: 'event', name_ar: 'أيام الوطن القبلي لمسرح الهواة (تجريبي)', name_fr: 'Journées du théâtre amateur du Cap Bon (démo)' },
  { slug: 'demo-short-film-days', kind: 'event', name_ar: 'أيام قليبية للفيلم القصير (تجريبي)', name_fr: 'Journées du court métrage de Kélibia (démo)' },
] as const;

export const ARTICLES: DemoArticle[] = [
  {
    key: 'corniche', lang: 'ar', category: 'cap-bon', format: 'news', author: 'leila', hoursAgo: 2, featured: true, image: 'fort', location: 'قليبية',
    tags: ['kelibia'],
    title: '[تجريبي] بلدية قليبية تنطلق في تهيئة الكورنيش قبل موسم الصيف',
    subtitle: 'أشغال على مسافة كيلومترين تشمل الإنارة والأرصفة ومسلكا للدراجات، وتنتهي حسب البلدية في أواخر شهر ماي.',
    body: [
      'انطلقت صباح اليوم أشغال تهيئة كورنيش المدينة على امتداد كيلومترين تقريبا، بين الميناء والشاطئ الرئيسي، وفق ما أعلنته البلدية في بلاغ نشرته على صفحتها.',
      'وتشمل الأشغال تجديد الإنارة العمومية وتوسيع الأرصفة وإحداث مسلك خاص بالدراجات، إلى جانب غراسة أشجار ووضع مقاعد على طول الطريق.',
      'وقال عضو بالمجلس البلدي لـ«البرج» إن الكلفة الجملية للمشروع تُقدّر بنحو مليون و800 ألف دينار، ممولة بقرض من صندوق القروض ومساعدة الجماعات المحلية ومساهمة من ميزانية البلدية.',
      { pull: '«نريد أن يكون الكورنيش جاهزا قبل عودة أبناء المدينة في الصيف»' },
      'وسيتم غلق جزء من الطريق أمام حركة السيارات على مراحل، مع تخصيص مسالك بديلة تمر عبر الأحياء المجاورة. ودعت البلدية المتساكنين وأصحاب المقاهي المطلة على البحر إلى التعاون مع المقاول.',
      'ويطالب عدد من المتساكنين منذ سنوات بإصلاح الكورنيش الذي تدهورت أرصفته بفعل الأمواج والرطوبة، خاصة في الجزء القريب من الميناء.',
    ],
  },
  {
    key: 'volley-win', lang: 'ar', category: 'volleyball', format: 'results', author: 'sofiene', hoursAgo: 4, location: 'منزل تميم',
    tags: ['menzel-temime', 'demo-club-menzel-temime', 'demo-club-haouaria', 'demo-league-volley'],
    title: '[تجريبي] الكرة الطائرة: النادي الرياضي بمنزل تميم يفوز على ES Haouaria بثلاثة أشواط لواحد (3-1)',
    subtitle: 'فوز ثالث على التوالي يضع الفريق في صدارة المجموعة قبل جولتين من نهاية المرحلة الأولى.',
    body: [
      'حقق النادي الرياضي بمنزل تميم فوزا مهما على ضيفه النجم الرياضي بالهوارية بثلاثة أشواط مقابل شوط واحد، في مباراة جرت مساء أمس بالقاعة المغطاة أمام جمهور غفير.',
      'وخسر أصحاب الأرض الشوط الأول بعد بداية متعثرة، قبل أن يستعيدوا توازنهم بفضل الإرسال القوي وحسن التغطية في الدفاع.',
      { table: [['الشوط', 'منزل تميم', 'الهوارية'], ['الأول', '22', '25'], ['الثاني', '25', '20'], ['الثالث', '25', '23'], ['الرابع', '25', '18']] },
      'وقال مدرب الفريق بعد اللقاء إن لاعبيه «أظهروا شخصية قوية بعد الشوط الأول»، مشيرا إلى أن الهدف يبقى التأهل إلى المرحلة النهائية.',
      { h2: 'ترتيب المجموعة' },
      { table: [['الفريق', 'لعب', 'نقاط'], ['منزل تميم', '8', '19'], ['الهوارية', '8', '17'], ['قربة', '8', '12'], ['تازركة', '8', '6']] },
    ],
  },
  {
    key: 'volley-preview', lang: 'ar', category: 'volleyball', format: 'report', author: 'sofiene', hoursAgo: 20,
    tags: ['demo-league-volley', 'korba'],
    title: '[تجريبي] الجولة التاسعة من البطولة الجهوية: مواجهة حاسمة في قربة',
    body: [
      'تُلعب نهاية هذا الأسبوع مباريات الجولة التاسعة من البطولة الجهوية للكرة الطائرة، وأبرزها مواجهة قربة وتازركة التي قد تحسم المركز الثالث.',
      'ويدخل فريق قربة المباراة بمعنويات مرتفعة بعد فوزه خارج قواعده، في حين يعاني منافسه من غيابات في خط الاستقبال.',
      'وستنطلق كل مباريات الجولة على الساعة الرابعة بعد الظهر، باستثناء مباراة منزل تميم المؤجلة إلى الأحد.',
    ],
  },
  {
    key: 'coach-interview', lang: 'ar', category: 'volleyball', format: 'interview', author: 'sofiene', hoursAgo: 30,
    tags: ['demo-club-haouaria', 'el-haouaria'],
    title: '[تجريبي] مدرب النجم الرياضي بالهوارية: «نعوّل على أبناء الجهة ولا نملك ميزانية النوادي الكبرى»',
    subtitle: 'حوار مع مدرب فريق الأكابر حول التكوين، وقاعة التدريب، وطموحات الموسم.',
    body: [
      'يقود المدرب فريق الأكابر بالنجم الرياضي بالهوارية منذ ثلاثة مواسم، بعد سنوات قضاها مع الأصناف الشابة. التقيناه بعد حصة تدريبية مسائية.',
      { qa: ['كيف تقيّم بداية الموسم؟', 'البداية مقبولة. خسرنا مباراتين بفارق شوط واحد، وهذا يعني أننا قريبون من المستوى المطلوب. ما ينقصنا هو التركيز في نهاية الأشواط.'] },
      { qa: ['الفريق يعتمد كثيرا على لاعبين شبان، هل هو اختيار أم ضرورة؟', 'الاثنان معا. لا نملك ميزانية النوادي الكبرى، لكننا نؤمن بأن أبناء الجهة قادرون على اللعب في مستوى عال إذا وجدوا الإطار المناسب.'] },
      { qa: ['ما هي أكبر صعوبة تواجهكم؟', 'القاعة. نتدرب في قاعة تشاركنا فيها ثلاث رياضات أخرى، ولا نحصل إلا على أربع حصص في الأسبوع. وعدتنا السلط الجهوية بحل قبل الموسم القادم.'] },
      { qa: ['وما هو هدفكم هذا الموسم؟', 'البقاء في المجموعة الأولى ومنح أكبر عدد من الدقائق للشبان. النتائج ستأتي بعد ذلك.'] },
    ],
  },
  {
    key: 'theatre-days', lang: 'ar', category: 'theatre', format: 'report', author: 'nadia', hoursAgo: 6, image: 'hammamet', location: 'الحمامات',
    tags: ['hammamet', 'demo-theatre-days'], featured: true,
    title: '[تجريبي] أيام مسرح الهواة تعود إلى الحمامات بعشرين عرضا من كامل الجهة',
    subtitle: 'فرق من نابل وقليبية وقربة وتازركة تتنافس على جوائز الدورة، والعروض مجانية.',
    body: [
      'تنطلق مساء الجمعة الدورة الجديدة من أيام الوطن القبلي لمسرح الهواة، بمشاركة عشرين فرقة من دور الثقافة والجمعيات المسرحية في الجهة.',
      'وأوضحت الهيئة المديرة أن العروض ستتوزع بين فضاء المدينة العتيقة وقاعة دار الثقافة، مع عروض في الهواء الطلق للأطفال كل صباح.',
      { quote: 'قالت رئيسة الهيئة: «اخترنا هذه السنة أن نفتح الباب أمام الفرق التي تشارك لأول مرة، وعددها سبع فرق».' },
      'وتتضمن الدورة ورشات في الكتابة المسرحية والإضاءة يؤطرها مسرحيون محترفون، إضافة إلى ندوة حول مسرح الهواة في المؤسسات التربوية.',
      'ويُختتم المهرجان يوم الأحد الموالي بالإعلان عن الجوائز وتقديم العرض المتوج.',
    ],
  },
  {
    key: 'music-night', lang: 'ar', category: 'music', format: 'news', author: 'nadia', hoursAgo: 26, location: 'قليبية', tags: ['kelibia'],
    title: '[تجريبي] سهرة للمالوف في ساحة الميناء بمشاركة فرقة الشباب',
    body: [
      'تحتضن ساحة الميناء بقليبية مساء السبت سهرة للمالوف تحييها فرقة الشباب التابعة لدار الثقافة، بمناسبة نهاية السنة التكوينية.',
      'ويضم برنامج السهرة نوبات وأغان تقليدية يؤديها نحو ثلاثين عازفا ومنشدا تتراوح أعمارهم بين 14 و25 سنة.',
      'والدعوة مفتوحة للعموم.',
    ],
  },
  {
    key: 'film-ar', lang: 'ar', category: 'cinema', format: 'news', author: 'nadia', hoursAgo: 8, image: 'town', location: 'قليبية',
    tags: ['kelibia', 'demo-short-film-days'],
    title: '[تجريبي] أيام قليبية للفيلم القصير تكشف عن قائمة الأفلام المشاركة',
    body: [
      'كشفت هيئة أيام قليبية للفيلم القصير عن قائمة الأفلام المشاركة في المسابقة الرسمية، وتضم خمسة عشر فيلما من تونس والجزائر والمغرب وفرنسا.',
      'وتتوزع الأفلام بين الروائي والوثائقي والتحريك، ومن بينها أربعة أفلام لطلبة معاهد السينما.',
      'وستُعرض الأفلام في دار الثقافة وفي الهواء الطلق بساحة الحصن، مع نقاش بعد كل عرض.',
    ],
  },
  {
    key: 'film-fr', lang: 'fr', category: 'cinema', format: 'news', author: 'nadia', hoursAgo: 7, image: 'town', location: 'Kélibia', translationOf: 'film-ar',
    tags: ['kelibia', 'demo-short-film-days'],
    title: '[Démo] Les Journées du court métrage de Kélibia dévoilent leur sélection',
    body: [
      'Les organisateurs des Journées du court métrage de Kélibia ont dévoilé la liste des films en compétition officielle : quinze courts métrages venus de Tunisie, d’Algérie, du Maroc et de France.',
      'La sélection mêle fiction, documentaire et animation, dont quatre films d’étudiants en école de cinéma.',
      'Les projections auront lieu à la maison de la culture et en plein air sur l’esplanade du fort, chacune suivie d’un débat.',
    ],
  },
  {
    key: 'book-review', lang: 'ar', category: 'books', format: 'review', author: 'nadia', hoursAgo: 50,
    title: '[تجريبي] «بيت على الشاطئ»: رواية أولى عن ذاكرة البحّارة',
    subtitle: 'قراءة في رواية متخيلة لكاتب شاب من الوطن القبلي.',
    body: [
      'تأخذنا هذه الرواية الأولى إلى بيت قديم على الشاطئ، تتعاقب عليه ثلاثة أجيال من عائلة بحّارة. ليست الحكاية جديدة في الأدب التونسي، لكن الكاتب يرويها بلغة هادئة ومقتصدة.',
      { h2: 'لغة البحر' },
      'أجمل ما في الرواية هو معجم البحر: أسماء الشباك والرياح والمواسم، التي يدمجها الكاتب في الحوار دون استعراض.',
      { h2: 'ما ينقصها' },
      'يبقى الفصل الأخير متعجلا، وكأن الكاتب أراد أن ينهي قصته قبل أن تكتمل. ومع ذلك، تبقى الرواية بداية واعدة تستحق القراءة.',
    ],
  },
  {
    key: 'fort-restoration', lang: 'ar', category: 'heritage', format: 'portrait', author: 'leila', hoursAgo: 72, image: 'fortWall', location: 'قليبية', tags: ['kelibia'],
    title: '[تجريبي] الحصن الذي يحرس المدينة منذ قرون: كيف يعمل فريق صغير من الحرفيين والمختصين في الترميم على إنقاذ الأسوار الحجرية لحصن قليبية من الرطوبة والرياح والتشققات قبل فوات الأوان',
    subtitle: 'يوم كامل مع فريق الترميم، من الصباح الباكر إلى غروب الشمس فوق الأسوار.',
    body: [
      'في السابعة صباحا يكون الفريق قد صعد إلى الأسوار. خمسة حرفيين ومهندسة مختصة في التراث، يعملون منذ أشهر على ترميم الجزء الشمالي من الحصن.',
      'الحجر هنا لا يُستبدل بسهولة. يجب أن يكون من نفس المقلع تقريبا، وأن يُقطع باليد، وأن تُستعمل في تثبيته ملاط من الجير بدل الإسمنت الذي يسرّع التلف.',
      { pull: '«الإسمنت يقتل الحجر القديم. الجير يتركه يتنفس»' },
      'تشرح المهندسة أن الرطوبة القادمة من البحر هي العدو الأول للأسوار، تليها الرياح التي تحمل الملح. لذلك يبدأ العمل دائما بمعالجة الشقوق التي يتسرب منها الماء.',
      'ويأمل الفريق أن ينتهي من الجزء الشمالي قبل الشتاء، على أن تنطلق المرحلة الثانية في الربيع إذا توفر التمويل.',
      'عند الغروب، ينزل الحرفيون من الأسوار ويتركون أدواتهم في غرفة صغيرة عند المدخل. غدا يوم آخر، وحجر آخر.',
    ],
  },
  {
    key: 'column-markets', lang: 'ar', category: 'opinion', format: 'column', author: 'leila', hoursAgo: 12,
    title: '[تجريبي] في مديح الأسواق الأسبوعية',
    body: [
      'كل أسبوع، تتحول ساحة صغيرة في كل مدينة من مدن الوطن القبلي إلى سوق. الخضر والغلال والأواني والملابس المستعملة، وأصوات الباعة التي لا تشبه أي صوت آخر.',
      'السوق الأسبوعية ليست مكانا للشراء فقط. هي المكان الذي تُتناقل فيه الأخبار، ويلتقي فيه أبناء القرى المجاورة، ويتعلم فيه الأطفال الحساب قبل المدرسة.',
      'حين نفكر في تهيئة مدننا، علينا أن نتذكر هذه الساحات، وأن نحميها من الإسمنت ومن النسيان.',
    ],
  },
  {
    key: 'opinion-youth', lang: 'ar', category: 'opinion', format: 'opinion', author: 'nadia', hoursAgo: 36,
    title: '[تجريبي] رأي: الرياضة المدرسية ليست ترفا',
    body: [
      'تراجعت الرياضة المدرسية في السنوات الأخيرة إلى ساعات قليلة وقاعات مغلقة. والنتيجة جيل يجلس أكثر مما يتحرك.',
      'النوادي في الجهات تشكو قلة المواهب، والمدرسة كانت دائما الخزان الأول لهذه المواهب. لا يمكن أن نطلب نتائج في الكرة الطائرة أو كرة اليد دون أن نعيد الاعتبار لحصة التربية البدنية.',
      'المطلوب ليس ميزانيات ضخمة، بل ساحات مهيأة وأساتذة يجدون الوقت والوسائل، وبطولات مدرسية تُنظم بانتظام.',
    ],
  },
  {
    key: 'olive-season', lang: 'ar', category: 'national', format: 'news', author: 'leila', hoursAgo: 5,
    title: '[تجريبي] انطلاق موسم جني الزيتون في عدد من الولايات وتوقعات بصابة متوسطة',
    body: [
      'انطلق موسم جني الزيتون في عدد من ولايات الشمال والوسط، وسط توقعات بصابة متوسطة بسبب نقص الأمطار في الربيع.',
      'ويشتكي الفلاحون من نقص اليد العاملة ومن ارتفاع كلفة الجني، في حين تعمل المعاصر على الاستعداد لاستقبال الكميات الأولى.',
      'وتبقى الأسعار عند الإنتاج غير واضحة في انتظار الإعلان عن توجهات السوق العالمية.',
    ],
  },
  {
    key: 'dams-analysis', lang: 'ar', category: 'national', format: 'analysis', author: 'leila', hoursAgo: 28,
    title: '[تجريبي] تحليل: لماذا تبقى مخزونات السدود دون المعدل رغم الأمطار الأخيرة',
    body: [
      'رغم الأمطار التي شهدتها البلاد في الأسابيع الأخيرة، تبقى نسبة امتلاء السدود دون معدلها في نفس الفترة من السنوات العادية.',
      { h2: 'تربة جافة' },
      'يفسر المختصون ذلك بأن التربة الجافة بعد صيف طويل تمتص الجزء الأكبر من مياه الأمطار الأولى، فلا يصل إلى السدود إلا القليل.',
      { h2: 'توزيع غير متكافئ' },
      'كما أن الأمطار تهاطلت بكميات كبيرة في مناطق لا تضم سدودا كبرى، في حين بقيت أحواض الشمال الغربي دون المأمول.',
      { h2: 'ماذا بعد؟' },
      'ينتظر أن تتحسن الوضعية إذا تواصلت الأمطار خلال الشتاء، لكن الخبراء يدعون إلى مواصلة ترشيد الاستهلاك في كل الحالات.',
    ],
  },
  {
    key: 'market-reportage', lang: 'ar', category: 'society', format: 'reportage', author: 'leila', hoursAgo: 10, image: 'door', location: 'منزل تميم',
    tags: ['menzel-temime'],
    title: '[تجريبي] صباح الثلاثاء في سوق منزل تميم: الفلفل والطماطم وأحاديث الصيف',
    body: [
      'قبل السادسة صباحا، تبدأ الشاحنات الصغيرة في الوصول إلى الساحة. يفرغ الفلاحون صناديق الفلفل والطماطم، وتملأ رائحة النعناع المكان.',
      'يقول بائع خضر يأتي من قرية مجاورة منذ عشرين سنة إن السوق تغيرت كثيرا، لكن روحها بقيت: «الناس يأتون للشراء وللحديث أيضا».',
      'في الركن المخصص للأواني، تعرض امرأة أواني فخارية من نابل، وتشرح لزبونة الفرق بين الطين المحلي والطين المستورد.',
      'وعند منتصف النهار، تبدأ الساحة في الإفراغ. يبقى بعض الأطفال يجمعون الصناديق الفارغة، وتعود الساحة إلى هدوئها حتى الثلاثاء المقبل.',
    ],
  },
  {
    key: 'blood-drive', lang: 'ar', category: 'society', format: 'news', author: 'leila', hoursAgo: 40, location: 'قربة', tags: ['korba'],
    title: '[تجريبي] حملة للتبرع بالدم في قربة تجمع أكثر من 120 متبرعا',
    body: [
      'نظمت جمعية محلية بالتعاون مع المستشفى الجهوي حملة للتبرع بالدم في دار الشباب بقربة، شارك فيها أكثر من 120 متبرعا.',
      'وأكد المنظمون أن الحملة تأتي في فترة يكثر فيها الطلب على الدم، ودعوا إلى تنظيم حملات مماثلة في المدن المجاورة.',
    ],
  },
  {
    key: 'blue-fish', lang: 'ar', category: 'economy', format: 'report', author: 'leila', hoursAgo: 14, image: 'beach', location: 'قليبية', tags: ['kelibia'],
    title: '[تجريبي] موسم الأسماك الزرقاء في ميناء قليبية: كميات وفيرة وأسعار متقلبة',
    body: [
      'يعيش ميناء قليبية على وقع موسم الأسماك الزرقاء، حيث تعود المراكب يوميا بكميات كبيرة من السردين والشورو.',
      'غير أن البحارة يشتكون من تقلب الأسعار من يوم لآخر، ومن نقص مخازن التبريد التي تسمح بحفظ الكميات الفائضة.',
      'ويطالب المهنيون بإحداث وحدة تحويل في الميناء تمكن من تثمين الإنتاج بدل بيعه بأسعار زهيدة في أيام الوفرة.',
    ],
  },
  {
    key: 'sponsored-olive-fair', lang: 'ar', category: 'economy', format: 'news', author: 'leila', hoursAgo: 18, sponsor: 'تعاونية تجريبية لزيت الزيتون',
    title: '[تجريبي] معرض زيت الزيتون البكر في نابل يفتح أبوابه للعموم',
    body: [
      'تفتح الدورة الجديدة من معرض زيت الزيتون البكر أبوابها في نابل نهاية هذا الأسبوع، بمشاركة منتجين صغار ومعاصر تقليدية من كامل الجهة.',
      'ويمكن للزوار تذوق الزيوت والتعرف على طرق الإنتاج والحفظ، إلى جانب ورشات للأطفال.',
      'هذا المحتوى تجريبي ويعرض شكل «المحتوى برعاية» على الموقع.',
    ],
  },
  {
    key: 'football-derby', lang: 'ar', category: 'football', format: 'results', author: 'sofiene', hoursAgo: 22,
    tags: ['demo-club-haouaria'],
    title: '[تجريبي] كرة القدم: تعادل سلبي في دربي الهوارية وقليبية',
    body: [
      'انتهى دربي الهوارية وقليبية في بطولة الرابطة الجهوية بالتعادل السلبي، في مباراة غابت عنها الفرص الواضحة.',
      'واكتفى الفريقان بنقطة تبقيهما في وسط الترتيب قبل خمس جولات من النهاية.',
    ],
  },
  {
    key: 'handball-youth', lang: 'ar', category: 'handball', format: 'news', author: 'sofiene', hoursAgo: 34, location: 'نابل', tags: ['nabeul'],
    title: '[تجريبي] كرة اليد: دورة للأصناف الشابة في نابل بمشاركة ثمانية فرق',
    body: [
      'تحتضن القاعة المغطاة بنابل دورة لكرة اليد في صنف الأصاغر بمشاركة ثمانية فرق من الوطن القبلي وتونس الكبرى.',
      'وتهدف الدورة إلى منح اللاعبين الشبان فرصة للعب مباريات رسمية خارج البطولة.',
    ],
  },
  {
    key: 'basket-fr', lang: 'fr', category: 'basketball', format: 'news', author: 'sofiene', hoursAgo: 44, location: 'Nabeul', tags: ['nabeul'],
    title: '[Démo] Basket-ball : une école de mini-basket ouvre ses portes à Nabeul',
    body: [
      'Une nouvelle école de mini-basket accueille depuis ce mois-ci les enfants de 6 à 11 ans dans la salle couverte de Nabeul.',
      'Les entraînements ont lieu deux fois par semaine, encadrés par d’anciens joueurs de la région.',
    ],
  },
  {
    key: 'regatta', lang: 'ar', category: 'other-sports', format: 'report', author: 'sofiene', hoursAgo: 60, image: 'beach', location: 'قليبية', tags: ['kelibia'],
    title: '[تجريبي] شراع: سباق للقوارب الخفيفة قبالة شاطئ قليبية',
    body: [
      'شارك نحو ثلاثين بحارا شابا في سباق للقوارب الخفيفة نظمه نادي الشراع المحلي قبالة شاطئ قليبية.',
      'وساهمت الرياح المعتدلة في سباق متكافئ، حسمه المتسابقون في الأمتار الأخيرة.',
    ],
  },
  {
    key: 'water-cut', lang: 'ar', category: 'cap-bon', format: 'news', author: 'leila', hoursAgo: 1, breaking: true, location: 'نابل', tags: ['nabeul'],
    title: '[تجريبي] انقطاع الماء الصالح للشرب في أحياء من نابل إلى غاية المساء',
    body: [
      'أعلنت الإدارة الجهوية لتوزيع المياه عن انقطاع الماء الصالح للشرب في عدد من أحياء نابل بسبب عطب في القناة الرئيسية.',
      'وينتظر أن يعود التزويد تدريجيا في ساعة متأخرة من المساء.',
    ],
  },
  {
    key: 'with-correction', lang: 'ar', category: 'cap-bon', format: 'news', author: 'leila', hoursAgo: 52, location: 'نابل', tags: ['nabeul'],
    correction: 'ذكرت نسخة سابقة من هذا المقال أن السوق البلدية ستُغلق ثلاثة أشهر، والصحيح شهران. نعتذر عن الخطأ.',
    title: '[تجريبي] غلق مؤقت للسوق البلدية بنابل لإجراء أشغال صيانة',
    body: [
      'تُغلق السوق البلدية بنابل لمدة شهرين ابتداء من الأسبوع القادم، لإجراء أشغال صيانة تشمل السقف وشبكة التصريف.',
      'وسيتم نقل التجار مؤقتا إلى ساحة مجاورة مهيأة للغرض.',
    ],
  },
  {
    key: 'erosion', lang: 'ar', category: 'cap-bon', format: 'investigation', author: 'leila', hoursAgo: 70, location: 'الهوارية', tags: ['el-haouaria'],
    extraCategories: ['society'],
    title: '[تجريبي] تحقيق: الشاطئ يتراجع في الهوارية، والحلول مؤجلة',
    subtitle: 'بين الصور القديمة وشهادات المتساكنين، أمتار من الرمل اختفت في عشرين سنة.',
    body: [
      'على الطريق المؤدية إلى الشاطئ، يشير أحد المتساكنين إلى عمود كهرباء قديم: «كان هنا الرمل، وكنا نلعب الكرة».',
      'خلال أسابيع، جمعنا صورا قديمة من أرشيف عائلات المنطقة وقارنّاها بصور حديثة. الفرق واضح في عدة نقاط من الساحل.',
      { h2: 'ماذا يقول المختصون' },
      'يربط المختصون تراجع الشاطئ بعوامل عدة: ارتفاع مستوى البحر، والبناء قرب الشريط الساحلي، واستخراج الرمل في فترات سابقة.',
      'ويؤكدون أن الحلول موجودة، من بينها حماية الكثبان الرملية وإعادة تغذية الشواطئ بالرمل، لكنها مكلفة وتتطلب تخطيطا على سنوات.',
      { h2: 'الدراسات موجودة، التنفيذ غائب' },
      'اطلعنا على دراستين أنجزتا في السنوات الأخيرة حول الساحل الشمالي للوطن القبلي. كلتاهما توصي بتدخل عاجل في عدة نقاط.',
      'لكن، إلى اليوم، لم يتم تنفيذ أي من التوصيات الكبرى، باستثناء أشغال محدودة لحماية الطريق.',
      'ويخشى المتساكنون أن يصل البحر إلى المنازل الأولى خلال سنوات إذا استمر الوضع على حاله.',
      'وتبقى الأسئلة مطروحة حول من سيتحمل كلفة الحماية، وحول قدرة البلديات الصغيرة على التحرك وحدها.',
    ],
  },
  {
    key: 'fisherman-portrait', lang: 'ar', category: 'cap-bon', format: 'portrait', author: 'leila', hoursAgo: 80, location: 'الهوارية', tags: ['el-haouaria'],
    title: '[تجريبي] بحّار من الهوارية: أربعون سنة في البحر وشبكة لا تزال تُخاط باليد',
    body: [
      'يجلس البحار العجوز أمام بيته الصغير قرب الميناء، يخيط شبكة ممزقة بأصابع تعرف عملها دون أن تنظر.',
      'بدأ الصيد في الرابعة عشرة مع والده. يقول إن البحر تغير كثيرا، وإن السمك أصبح أبعد وأقل.',
      'لا يريد لأبنائه أن يصبحوا بحارة، لكنه يعرف أن أحدهم سيعود يوما إلى القارب.',
    ],
  },
  {
    key: 'literacy-fr', lang: 'fr', category: 'society', format: 'news', author: 'nadia', hoursAgo: 15, location: 'Korba', tags: ['korba'],
    title: '[Démo] Korba : une association lance des cours d’alphabétisation pour adultes',
    body: [
      'Une association locale propose depuis cette semaine des cours d’alphabétisation gratuits pour les adultes, deux soirs par semaine à la maison des jeunes de Korba.',
      'Une trentaine de personnes se sont déjà inscrites, en majorité des femmes travaillant dans l’agriculture.',
    ],
  },
  {
    key: 'oranges-fr', lang: 'fr', category: 'economy', format: 'report', author: 'nadia', hoursAgo: 48, location: 'Menzel Bouzelfa', tags: ['menzel-bouzelfa'],
    title: '[Démo] À Menzel Bouzelfa, les producteurs d’agrumes s’inquiètent du manque d’eau, de la hausse des coûts de production et de la concurrence sur les marchés européens à l’approche d’une saison qui s’annonce difficile',
    body: [
      'Dans les vergers de Menzel Bouzelfa, la récolte des oranges approche, mais l’optimisme n’est pas au rendez-vous.',
      'Les producteurs évoquent des nappes en baisse, des factures d’électricité plus lourdes pour le pompage et une concurrence accrue à l’export.',
      'Plusieurs agriculteurs se tournent vers l’irrigation goutte à goutte, encore coûteuse pour les petites exploitations.',
    ],
  },
  {
    key: 'volley-women-fr', lang: 'fr', category: 'volleyball', format: 'news', author: 'sofiene', hoursAgo: 32, location: 'Kélibia', tags: ['kelibia'],
    title: '[Démo] Volley-ball : une sélection régionale féminine en stage à Kélibia',
    body: [
      'Une sélection régionale féminine de volley-ball effectue cette semaine un stage de préparation à Kélibia, avec deux séances par jour.',
      'Le staff souhaite évaluer une vingtaine de joueuses de moins de 19 ans avant les tournois de l’été.',
    ],
  },
  {
    key: 'long-headline', lang: 'ar', category: 'national', format: 'news', author: 'leila', hoursAgo: 9,
    title: '[تجريبي] وزارة الإشراف تعلن عن روزنامة جديدة لمواعيد التسجيل في المعاهد العليا وتدعو الطلبة الجدد إلى إتمام إجراءاتهم عن بعد قبل نهاية الشهر لتفادي الاكتظاظ أمام المؤسسات الجامعية في الأيام الأولى',
    body: [
      'أعلنت الوزارة عن روزنامة جديدة لمواعيد التسجيل في المعاهد العليا، تمتد على ثلاثة أسابيع.',
      'ودعت الطلبة الجدد إلى إتمام الإجراءات عبر المنصة الإلكترونية لتفادي الاكتظاظ.',
    ],
  },
  {
    key: 'pottery-expo', lang: 'ar', category: 'visual-arts', format: 'news', author: 'nadia', hoursAgo: 64, location: 'نابل', tags: ['nabeul'],
    title: '[تجريبي] معرض للخزف الفني في نابل يجمع حرفيين وفنانين شبانا',
    body: [
      'يحتضن رواق الفنون بنابل معرضا للخزف الفني يجمع أعمال حرفيين مخضرمين وفنانين شبان من خريجي معاهد الفنون الجميلة.',
      'ويستمر المعرض ثلاثة أسابيع، مع ورشات مفتوحة للأطفال كل سبت.',
    ],
  },
  {
    key: 'chronique-fr', lang: 'fr', category: 'opinion', format: 'column', author: 'nadia', hoursAgo: 58,
    title: '[Démo] Chronique : la mer, la ville et nous',
    body: [
      'Il suffit de marcher le long de la corniche un soir d’automne pour comprendre ce que la mer donne à nos villes : de l’air, de l’horizon, et une manière d’être ensemble.',
      'Encore faut-il que nous sachions la protéger, et ne pas la traiter comme un simple décor.',
    ],
  },
];
