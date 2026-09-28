export type SourceAcquisition = "snapshot" | "query" | "pagination";
export type SourceCapability = {
  acquisition: SourceAcquisition;
  supportsQuery: boolean;
  supportsDateFilter: boolean;
  supportsSalaryFilter: boolean;
  supportsWorkModeFilter: boolean;
  supportsEmploymentFilter: boolean;
  supportsPagination: boolean;
  note: string;
};

export const SOURCE_CAPABILITIES: Readonly<Record<string, SourceCapability>> = Object.freeze({
  hh: { acquisition: "query", supportsQuery: true, supportsDateFilter: true, supportsSalaryFilter: true, supportsWorkModeFilter: true, supportsEmploymentFilter: true, supportsPagination: true, note: "Поиск выполняется через BFF; доступ может зависеть от ограничений HH." },
  trudvsem: { acquisition: "query", supportsQuery: true, supportsDateFilter: false, supportsSalaryFilter: true, supportsWorkModeFilter: true, supportsEmploymentFilter: true, supportsPagination: true, note: "Источник запрашивается отдельно; автоматический первый экран ограничен из-за времени ответа." },
  remoteok: { acquisition: "snapshot", supportsQuery: true, supportsDateFilter: true, supportsSalaryFilter: true, supportsWorkModeFilter: true, supportsEmploymentFilter: false, supportsPagination: false, note: "Используется серверный снимок с клиентской фильтрацией." },
  weworkremotely: { acquisition: "snapshot", supportsQuery: true, supportsDateFilter: true, supportsSalaryFilter: true, supportsWorkModeFilter: true, supportsEmploymentFilter: false, supportsPagination: false, note: "Используется серверный RSS-снимок." },
  remotive: { acquisition: "snapshot", supportsQuery: true, supportsDateFilter: true, supportsSalaryFilter: true, supportsWorkModeFilter: true, supportsEmploymentFilter: false, supportsPagination: false, note: "Используется серверный снимок; обновление зависит от cache refresh." },
  jobicy: { acquisition: "snapshot", supportsQuery: true, supportsDateFilter: true, supportsSalaryFilter: true, supportsWorkModeFilter: true, supportsEmploymentFilter: false, supportsPagination: false, note: "Используется серверный снимок." },
  arbeitnow: { acquisition: "snapshot", supportsQuery: true, supportsDateFilter: true, supportsSalaryFilter: true, supportsWorkModeFilter: true, supportsEmploymentFilter: true, supportsPagination: false, note: "Remote-флаг и salary нормализуются сервером." },
  remocate: { acquisition: "query", supportsQuery: true, supportsDateFilter: true, supportsSalaryFilter: true, supportsWorkModeFilter: true, supportsEmploymentFilter: false, supportsPagination: false, note: "Запрос выполняется отдельно по поисковой строке." },
  ats: { acquisition: "snapshot", supportsQuery: true, supportsDateFilter: true, supportsSalaryFilter: true, supportsWorkModeFilter: true, supportsEmploymentFilter: true, supportsPagination: false, note: "Агрегируются публичные ATS endpoint'ы работодателей." },
  telegram: { acquisition: "query", supportsQuery: true, supportsDateFilter: true, supportsSalaryFilter: true, supportsWorkModeFilter: true, supportsEmploymentFilter: false, supportsPagination: false, note: "Доступен после настройки публичных Telegram-каналов." },
});

export function getSourceCapability(source: string): SourceCapability | null {
  return SOURCE_CAPABILITIES[source] || null;
}

export function capabilityLabel(capability: SourceCapability): string {
  return capability.acquisition === "snapshot" ? "снимок" : capability.acquisition === "query" ? "по запросу" : "с пагинацией";
}
