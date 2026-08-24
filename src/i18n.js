/**
 * All user-facing text lives here, so wording stays consistent and can be
 * changed in one place. The app ships in Ukrainian.
 */
export const LOCALE = 'uk-UA'

/** Ukrainian plural form: plural(n, ['день', 'дні', 'днів']). */
export function plural(n, forms) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export const t = {
  app: {
    name: 'Завдання',
    tasks: ['завдання', 'завдання', 'завдань'],
    projects: ['проєкт', 'проєкти', 'проєктів'],
  },

  views: {
    calendar: 'Календар',
    planner: 'Планер тижня',
    all: 'Усі завдання',
    today: 'Сьогодні',
    upcoming: 'Найближчі',
    overdue: 'Прострочені',
    repeating: 'Повторювані',
    done: 'Виконані',
  },

  nav: {
    tasks: 'Завдання',
    calendar: 'Календар',
    planner: 'Планер',
    menu: 'Меню',
    back: 'Назад',
  },

  sidebar: {
    projects: 'Проєкти',
    archived: 'Архів',
    newProject: 'Новий проєкт',
    noProjects: 'Проєктів ще немає. Створи для життя, роботи, весілля…',
    actions: 'Дії проєкту',
    edit: 'Редагувати',
    moveUp: 'Вище',
    moveDown: 'Нижче',
    archive: 'Архівувати',
    restore: 'Відновити',
    delete: 'Видалити',
    themeToLight: 'Світла тема',
    themeToDark: 'Темна тема',
    export: 'Експортувати резервну копію (JSON)',
    import: 'Імпортувати резервну копію (JSON)',
    importFailed: 'Не вдалося імпортувати:',
  },

  list: {
    addPlaceholder: 'Нове завдання — обовʼязкова лише назва',
    add: 'Додати',
    search: 'Пошук завдань…',
    sort: 'Сортування',
    sortManual: 'Мій порядок',
    sortDue: 'За дедлайном',
    sortPriority: 'За пріоритетом',
    sortCreated: 'Спочатку нові',
    sortAlpha: 'А → Я',
    showDone: 'Показати виконані',
    hideDone: 'Сховати виконані',
    doneOf: (done, total) => `${done} / ${total} виконано`,
    clearCompleted: 'Прибрати виконані',
    archivedBadge: 'в архіві',
    hints: 'Підказки:',
    emptySearchTitle: 'Нічого не знайшлося',
    emptySearchText: 'Спробуй коротше слово або очисти пошук.',
    emptyTitle: 'Тут поки порожньо',
    emptyText: 'Напиши завдання у полі вище, щоб додати перше.',
  },

  task: {
    up: 'Вище',
    down: 'Нижче',
    duplicate: 'Дублювати',
    delete: 'Видалити',
    hasNote: 'Є опис',
    timesDone: 'Разів виконано',
    markDone: 'Позначити виконаним',
    done: 'Виконано',
    notDone: 'Зняти позначку',
    close: 'Закрити',
    title: 'Назва завдання',
    description: 'Опис',
    descriptionPlaceholder: 'Нотатки, посилання — усе, що допоможе згадати…',
    project: 'Проєкт',
    deadline: 'Дедлайн',
    today: 'Сьогодні',
    tomorrow: 'Завтра',
    plusWeek: '+1 тиждень',
    clear: 'Прибрати',
    plan: 'Дні роботи',
    planHint: 'Коли саме ти цим займаєшся — окремо від дедлайну. Ці дні видно у «Сьогодні» та в календарі.',
    planAdd: 'Додати день',
    repeat: 'Повторення',
    repeatEvery: 'Кожні',
    unitDay: 'дн.',
    unitWeek: 'тиж.',
    unitMonth: 'міс.',
    unitYear: 'р.',
    repeatMovesTo: 'позначиш виконаним — перенесеться на',
    completedTimes: (n) => `Виконано ${n} ${plural(n, ['раз', 'рази', 'разів'])}`,
    lastTime: 'востаннє',
    priority: 'Пріоритет',
    tags: 'Теги',
    tagPlaceholder: 'Новий тег, натисни Enter',
    created: 'Створено',
    completedAt: 'Виконано',
  },

  priority: {
    none: 'Без пріоритету',
    low: 'Низький',
    medium: 'Середній',
    high: 'Високий',
  },

  repeat: {
    none: 'Ніколи',
    day: 'Щодня',
    weekday: 'Робочі дні',
    week: 'Щотижня',
    month: 'Щомісяця',
    year: 'Щороку',
    custom: 'Свій варіант',
    daily: 'Щодня',
    weekly: 'Щотижня',
    monthly: 'Щомісяця',
    yearly: 'Щороку',
    everyN: (n, unit) => `Кожні ${n} ${unit}`,
    onDays: 'у',
  },

  project: {
    newTitle: 'Новий проєкт',
    editTitle: 'Редагувати проєкт',
    name: 'Назва',
    namePlaceholder: 'Весілля, робота, навчання…',
    icon: 'Іконка',
    color: 'Колір',
    preview: 'Назва проєкту',
    create: 'Створити проєкт',
    save: 'Зберегти',
  },

  planner: {
    title: 'Планер тижня',
    pool: 'Незаплановані',
    poolHint: 'Перетягни завдання у потрібний день. Можна класти одне завдання на кілька днів.',
    poolEmpty: 'Усе розкладено по днях 🎉',
    allProjects: 'Усі проєкти',
    search: 'Пошук завдань…',
    dropHere: 'Перетягни сюди',
    addToDay: 'Додати завдання на цей день',
    removeFromDay: 'Прибрати з цього дня',
    plannedCount: (n) => `${n} ${plural(n, ['завдання', 'завдання', 'завдань'])}`,
    weekLoad: 'Навантаження тижня',
    extend: 'Робити й наступні дні',
    moveTo: 'Перенести на день',
    moveTitle: 'Перенести на',
    extendTitle: 'Продовжити на',
    clearPlan: 'Прибрати всі дні',
  },

  calendar: {
    title: 'Календар',
    month: 'Місяць',
    week: 'Тиждень',
    day: 'День',
    today: 'Сьогодні',
    prev: 'Назад',
    next: 'Вперед',
    newEvent: 'Подія',
    allDay: 'Увесь день',
    planTasks: 'Запланувати завдання',
    noDuration: 'Тривалість не вказана',
    eventTitle: 'Назва події',
    eventTitlePlaceholder: 'Зустріч, дзвінок, тренування…',
    date: 'Дата',
    start: 'Початок',
    duration: 'Тривалість',
    durationUnknown: 'Не знаю',
    durationOther: 'Інша тривалість…',
    durationCustom: 'Своя тривалість',
    endsAt: 'закінчиться о',
    more: (n) => `ще ${n}`,
    minutes: 'хв',
    hours: 'год',
    notes: 'Нотатки',
    createEvent: 'Створити подію',
    saveEvent: 'Зберегти',
    deleteEvent: 'Видалити подію',
    newEventTitle: 'Нова подія',
    editEventTitle: 'Редагувати подію',
    dueHere: 'дедлайн',
    planTitle: (date) => `Що робиш ${date}?`,
    planSearch: 'Пошук серед завдань…',
    planEmpty: 'Немає незавершених завдань.',
    planDone: 'Готово',
    weekOf: 'Тиждень',
  },

  sync: {
    title: 'Синхронізація',
    open: 'Синхронізація між пристроями',
    notConfigured: 'Синхронізацію ще не налаштовано',
    setupHint:
      'Щоб завдання були однакові на компʼютері й телефоні, потрібен безкоштовний проєкт Supabase. ' +
      'Покрокова інструкція — у файлі README.md, розділ «Синхронізація».',
    email: 'Пошта',
    password: 'Пароль',
    passwordHint: 'Мінімум 6 символів',
    signIn: 'Увійти',
    signUp: 'Створити акаунт',
    haveAccount: 'Вже є акаунт? Увійти',
    noAccount: 'Немає акаунта? Створити',
    signOut: 'Вийти',
    signedInAs: 'Ти увійшов як',
    syncNow: 'Синхронізувати зараз',
    checkEmail: 'Перевір пошту й підтверди адресу, потім увійди.',
    statusIdle: 'Не увійшов',
    statusSyncing: 'Синхронізую…',
    statusSynced: 'Синхронізовано',
    statusError: 'Помилка',
    statusOffline: 'Немає мережі — збережу локально',
    lastSync: 'Востаннє',
    never: 'ще не було',
    errors: {
      loginsDisabled:
        'Провайдер Email вимкнено у Supabase. Authentication → Sign In / Providers → Email → ' +
        'увімкнути сам провайдер (перемикач угорі блоку) → Save.',
      signupsDisabled:
        'Реєстрацію вимкнено в налаштуваннях Supabase. Або увімкни «Allow new users to sign up» ' +
        '(Authentication → Sign In / Providers → Email), або створи користувача вручну: ' +
        'Authentication → Users → Add user, і тоді тисни «Увійти».',
      invalidCredentials: 'Невірна пошта або пароль.',
      notConfirmed:
        'Пошту не підтверджено. Або підтверди листа, або вимкни «Confirm email» ' +
        'у Supabase → Authentication → Sign In / Providers → Email.',
      alreadyRegistered: 'Такий акаунт уже існує — тисни «Увійти».',
      weakPassword: 'Пароль має бути щонайменше 6 символів.',
      rateLimit: 'Забагато спроб поспіль. Спробуй за хвилину.',
      network: 'Немає звʼязку з Supabase. Перевір інтернет.',
      tableMissing:
        'У базі немає таблиці app_state. Виконай SQL з README (розділ «Синхронізація», крок 2).',
    },
    explain:
      'Дані зливаються за часом зміни: правки з обох пристроїв зберігаються, ' +
      'а якщо одне й те саме завдання змінене двічі — лишається новіша версія. ' +
      'Без мережі все працює локально й доганяє, щойно звʼязок зʼявиться.',
  },

  confirm: {
    cancel: 'Скасувати',
    taskTitle: 'Видалити завдання?',
    taskText: (title) => `«${title}» буде видалено назавжди.`,
    taskLabel: 'Видалити завдання',
    projectTitle: 'Видалити проєкт?',
    projectText: (title, count) =>
      `«${title}» разом із ${count} ${plural(count, ['завданням', 'завданнями', 'завданнями'])} буде видалено назавжди. ` +
      'Якщо можеш повернутися до нього — краще заархівуй.',
    projectLabel: 'Видалити назавжди',
    clearTitle: 'Прибрати виконані?',
    clearText: (count) =>
      `${count} ${plural(count, ['виконане завдання', 'виконані завдання', 'виконаних завдань'])} буде видалено назавжди.`,
    clearLabel: (count) => `Видалити ${count}`,
    eventTitle: 'Видалити подію?',
    eventText: (title) => `«${title}» зникне з календаря.`,
    eventLabel: 'Видалити подію',
  },

  toast: {
    rolled: (title, when) => `«${title}» виконано — наступне ${when}`,
    undo: 'Повернути',
    dismiss: 'Закрити',
  },
}
