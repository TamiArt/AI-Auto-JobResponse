import { useRef, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Config } from "../../domain/types";
import { validateImportedConfig } from "../../lib/config";

export function ConfigPanel({ config, onImport }: { config: Config; onImport: (config: Config) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "huntpulse_config.json";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Конфиг сохранён", { description: "Файл huntpulse_config.json скачан" });
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast.error("Неверный формат", { description: "Выберите .json файл" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const result = validateImportedConfig(JSON.parse(loadEvent.target?.result as string));
        if (result.valid === false) {
          toast.error("Ошибка структуры JSON", { description: result.error });
          return;
        }
        onImport(result.data);
        toast.success("Конфиг загружен", { description: "Настройки поиска обновлены" });
      } catch {
        toast.error("Не удалось прочитать файл", { description: "Файл повреждён или не является валидным JSON" });
      }
    };
    reader.onerror = () => toast.error("Ошибка чтения файла");
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-4">JSON конфигурация</div>
      <p className="text-xs text-foreground/60 font-mono leading-relaxed mb-4">Экспортируйте профессию, регион и минимальную зарплату для резервной копии или переноса на другое устройство.</p>
      <div className="flex gap-3">
        <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:border-[var(--neon-violet)]/30 transition-all min-h-[48px]">
          <Download size={14} />Скачать
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 min-h-[48px]"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 16px rgba(139,92,246,0.3)" }}>
          <Upload size={14} />Загрузить
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </div>
  );
}
