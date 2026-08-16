export interface ProfessionGroup {
  label: string;
  examples: string[];
}

export const PROFESSION_GROUPS: ProfessionGroup[] = [
  { label: "Разработка и IT", examples: ["Frontend-разработчик", "Backend-разработчик", "DevOps-инженер", "Системный аналитик"] },
  { label: "Тестирование", examples: ["QA-инженер", "Инженер по автоматизации тестирования", "Тестировщик мобильных приложений"] },
  { label: "Дизайн", examples: ["Графический дизайнер", "UX/UI-дизайнер", "Веб-дизайнер", "Дизайнер презентаций"] },
  { label: "Иллюстрация и искусство", examples: ["Иллюстратор", "2D-художник", "3D-художник", "Concept artist"] },
  { label: "Продукт и управление", examples: ["Продакт-менеджер", "Проджект-менеджер", "Scrum-мастер", "Бизнес-аналитик"] },
  { label: "Маркетинг и контент", examples: ["Контент-менеджер", "Копирайтер", "SMM-менеджер", "Маркетолог"] },
  { label: "Работа с данными", examples: ["Аналитик данных", "Data scientist", "BI-аналитик", "Data engineer"] },
  { label: "Поддержка и операции", examples: ["Специалист поддержки", "Аккаунт-менеджер", "HR-специалист", "Рекрутер"] },
];

export const PROFESSION_EXAMPLES = PROFESSION_GROUPS.flatMap(({ examples }) => examples);
