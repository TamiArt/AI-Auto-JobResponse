import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArrowRight, Bot, BrainCircuit, Check, CheckCircle, ChevronDown, ChevronUp, Copy, Cpu, Download, ExternalLink, FileText, Globe, History, Key, Plus, Shield, Sparkles, Upload, Zap } from "lucide-react";
import { toast } from "sonner";
import { JOB_SOURCES, validateImportedConfig, type Config } from "../../model";
import { PROVIDERS } from "../../providers";

// ─── Guide helpers ─────────────────────────────────────────────────────────────
function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono text-white mt-0.5" style={{ background: "linear-gradient(135deg, #8B5CF6, #06b6d4)" }}>{n}</div>
      <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
    </div>
  );
}
function CodeSnip({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group mt-2 rounded-lg border border-border bg-muted overflow-hidden">
      <pre className="px-4 py-3 text-xs font-mono text-[var(--neon-cyan)] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{children}</pre>
      <button onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-2 right-2 p-1.5 rounded bg-card/90 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all min-w-[30px] min-h-[30px] flex items-center justify-center">
        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      </button>
    </div>
  );
}
function FreeBadge() { return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border text-emerald-400 bg-emerald-400/10 border-emerald-400/30 ml-1">✦ Бесплатно</span>; }
function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--neon-violet)] underline underline-offset-2 hover:no-underline inline-flex items-center gap-0.5">{children}<ExternalLink size={10} /></a>;
}

// ─── JSON Config Panel ─────────────────────────────────────────────────────────
function ConfigPanel({ config, onImport }: { config: Config; onImport: (c: Config) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "huntpulse_config.json"; a.click(); URL.revokeObjectURL(url);
    toast.success("Конфиг сохранён", { description: "Файл huntpulse_config.json скачан" });
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.name.endsWith(".json")) { toast.error("Неверный формат", { description: "Выберите .json файл" }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = validateImportedConfig(JSON.parse(ev.target?.result as string));
        if (!result.valid) { toast.error("Ошибка структуры JSON", { description: result.error }); return; }
        onImport(result.data); localStorage.setItem("huntpulse_config", JSON.stringify(result.data));
        toast.success("Конфиг загружен", { description: "Все поля обновлены" });
      } catch { toast.error("Не удалось прочитать файл", { description: "Файл повреждён или не является валидным JSON" }); }
    };
    reader.onerror = () => toast.error("Ошибка чтения файла");
    reader.readAsText(file); if (fileRef.current) fileRef.current.value = "";
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-4">JSON конфигурация</div>
      <p className="text-xs text-foreground/60 font-mono leading-relaxed mb-4">Экспортируйте настройки для резервной копии или переноса на другое устройство.</p>
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

// ─── Guide Tab ─────────────────────────────────────────────────────────────────
export function GuideTab({ onGoToSettings, initialSection }: { onGoToSettings: () => void; initialSection?: string | null }) {
  const [openSection, setOpenSection] = useState<string | null>(initialSection || "gemini");
  useEffect(() => { if (initialSection) setOpenSection(initialSection); }, [initialSection]);

  const sections = [
    { id: "gemini", icon: <Sparkles size={16} />, title: "Google Gemini API", extra: <FreeBadge />, accent: "var(--neon-green)", content: (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-400/8 border border-emerald-400/20 text-xs font-mono text-emerald-400"><CheckCircle size={13} className="shrink-0 mt-0.5" />Бесплатно · <strong>1 500 req/day</strong> · без карты</div>
        <div className="space-y-3">
          <Step n={1}>Перейдите на <ExtLink href="https://aistudio.google.com">aistudio.google.com</ExtLink> и войдите через Google.</Step>
          <Step n={2}>В левом меню нажмите <strong>«Get API key»</strong>, затем <strong>«Create API key»</strong>.</Step>
          <Step n={3}>Скопируйте ключ — он начинается с <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">AIza...</code> — и вставьте в настройки.</Step>
        </div>
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-[var(--neon-violet)]/10 border border-[var(--neon-violet)]/20 text-xs font-mono text-[var(--neon-violet)]"><Shield size={13} className="shrink-0 mt-0.5" />При 15 откликах/день хватит на 100 дней без единого платежа.</div>
      </div>
    )},
    { id: "groq", icon: <Cpu size={16} />, title: "Groq API (Llama 3)", extra: <FreeBadge />, accent: "var(--neon-cyan)", content: (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-400/8 border border-emerald-400/20 text-xs font-mono text-emerald-400"><Cpu size={13} className="shrink-0 mt-0.5" />Сверхбыстрая генерация на Llama 3. Бесплатно, карта не нужна.</div>
        <div className="space-y-3">
          <Step n={1}>Откройте <ExtLink href="https://console.groq.com">console.groq.com</ExtLink> и зарегистрируйтесь.</Step>
          <Step n={2}>В меню выберите <strong>«API Keys»</strong> → <strong>«Create API Key»</strong>.</Step>
          <Step n={3}>Ключ начинается с <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">gsk_...</code>. Вставьте в настройки HuntPulse.</Step>
        </div>
      </div>
    )},
    { id: "openrouter", icon: <Globe size={16} />, title: "OpenRouter API", extra: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border text-violet-400 bg-violet-400/10 border-violet-400/30 ml-1">:free модели</span>, accent: "var(--neon-violet)", content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <Step n={1}>Перейдите на <ExtLink href="https://openrouter.ai">openrouter.ai</ExtLink> и создайте аккаунт.</Step>
          <Step n={2}>Откройте раздел <strong>Keys</strong> → <strong>«Create Key»</strong>. Ключ: <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">sk-or-...</code></Step>
          <Step n={3}>Используйте модели с суффиксом <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">:free</code>:<CodeSnip>{`meta-llama/llama-3.1-8b-instruct:free\nmistralai/mistral-7b-instruct:free`}</CodeSnip></Step>
        </div>
      </div>
    )},
    { id: "hhtoken", icon: <Key size={16} />, title: "HH Access Token — подробная инструкция", accent: "#f59e0b", content: (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-amber-400/8 border border-amber-400/20 text-xs font-mono text-amber-400">
          <Shield size={13} className="shrink-0 mt-0.5" />
          <div>Токен — это ключ доступа к вашему аккаунту HH.ru через API. Он даёт право откликаться от вашего имени. Храните его как пароль — HuntPulse не передаёт его никуда.</div>
        </div>

        <div className="px-3 py-2.5 rounded-lg bg-muted text-xs font-mono text-muted-foreground">
          <span className="text-foreground/70 font-semibold">Что понадобится:</span> аккаунт HH.ru, браузер, 5 минут.
        </div>

        <div className="space-y-4">
          <Step n={1}>
            <div>Перейдите на портал разработчика HeadHunter: <ExtLink href="https://dev.hh.ru/admin">dev.hh.ru/admin</ExtLink></div>
            <div className="mt-1.5 text-xs text-foreground/60">Войдите с тем аккаунтом HH.ru, с которого хотите откликаться. Если аккаунта нет — сначала зарегистрируйтесь на hh.ru.</div>
          </Step>
          <Step n={2}>
            <div>Нажмите кнопку <strong>«Создать приложение»</strong>. Заполните форму:</div>
            <div className="mt-2 space-y-1">
              {[["Название", "HuntPulse AI (или любое удобное)"], ["Описание", "Личный инструмент автоотклика"], ["Redirect URI", "https://localhost"]].map(([k, v]) => (
                <div key={k} className="flex gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-mono">
                  <span className="text-muted-foreground w-24 shrink-0">{k}:</span>
                  <span className="text-[var(--neon-cyan)]">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-foreground/60">После создания вы получите <strong>client_id</strong> и <strong>client_secret</strong> — сохраните их.</div>
          </Step>
          <Step n={3}>
            <div>Откройте в браузере URL авторизации (замените <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">ВАШ_CLIENT_ID</code> на своё значение):</div>
            <CodeSnip>{`https://hh.ru/oauth/authorize\n  ?response_type=code\n  &client_id=ВАШ_CLIENT_ID\n  &redirect_uri=https://localhost`}</CodeSnip>
            <div className="mt-2 text-xs text-foreground/60">Нажмите «Разрешить». Браузер перенаправит вас на адрес вида: <code className="bg-muted px-1 rounded">https://localhost/?code=XXXXXXXX</code>. Скопируйте значение <strong>code=...</strong> из адресной строки.</div>
          </Step>
          <Step n={4}>
            <div>Обменяйте код на Access Token. Выполните в терминале (или через <ExtLink href="https://hoppscotch.io">Hoppscotch</ExtLink>):</div>
            <CodeSnip>{`curl -X POST "https://hh.ru/oauth/token" \\\n  -H "Content-Type: application/x-www-form-urlencoded" \\\n  -d "grant_type=authorization_code" \\\n  -d "client_id=ВАШ_CLIENT_ID" \\\n  -d "client_secret=ВАШ_CLIENT_SECRET" \\\n  -d "code=КОД_ИЗ_БРАУЗЕРА" \\\n  -d "redirect_uri=https://localhost"`}</CodeSnip>
          </Step>
          <Step n={5}>
            <div>В ответе вы получите JSON. Скопируйте значение поля <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">access_token</code>:</div>
            <CodeSnip>{`{\n  "access_token": "EXAMPLE_TOKEN_abcdef12345",\n  "token_type": "bearer",\n  "expires_in": 1209600,\n  "refresh_token": "..."\n}`}</CodeSnip>
            <div className="mt-2 text-xs text-foreground/60">Вставьте <code className="bg-muted px-1 rounded">access_token</code> в поле <strong>HH Access Token</strong> в настройках HuntPulse. Готово!</div>
          </Step>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-400/8 border border-amber-400/20 text-xs font-mono text-amber-400">
            <AlertCircle size={12} className="shrink-0 mt-0.5" /><div>Токен действует <strong>14 дней</strong>. После истечения повторите шаги 3–5.</div>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-400/8 border border-emerald-400/20 text-xs font-mono text-emerald-400">
            <CheckCircle size={12} className="shrink-0 mt-0.5" /><div>Для обновления токена используйте <code>refresh_token</code> из ответа.</div>
          </div>
        </div>
      </div>
    )},
    { id: "resumeid", icon: <FileText size={16} />, title: "Resume ID — где найти", accent: "var(--neon-cyan)", content: (
      <div className="space-y-4">
        <p className="text-sm text-foreground/70 leading-relaxed">Resume ID — уникальный идентификатор вашего резюме на hh.ru. Выглядит как строка букв и цифр длиной ~20 символов.</p>

        <div className="space-y-4">
          <Step n={1}>
            <div>Войдите на HeadHunter и перейдите в раздел «Мои резюме»: <ExtLink href="https://hh.ru/applicant/resumes">hh.ru/applicant/resumes</ExtLink></div>
          </Step>
          <Step n={2}>
            <div>Нажмите на нужное резюме, чтобы открыть его страницу. Посмотрите на адресную строку браузера — вы увидите URL вида:</div>
            <CodeSnip>{`https://hh.ru/resume/abc123def4560000000`}</CodeSnip>
            <div className="mt-2 text-xs text-foreground/60">Часть после <code className="bg-muted px-1 rounded">/resume/</code> — это и есть ваш Resume ID. В примере выше это <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">abc123def4560000000</code>.</div>
          </Step>
          <Step n={3}>
            <div><strong>Альтернативный способ через API</strong> (если токен уже получен — вернёт список всех ваших резюме):</div>
            <CodeSnip>{`curl "https://api.hh.ru/resumes/mine" \\\n  -H "Authorization: Bearer ВАШ_ACCESS_TOKEN" \\\n  -H "HH-User-Agent: HuntPulse/1.0 (huntpulse@example.com)"`}</CodeSnip>
            <div className="mt-2 text-xs text-foreground/60">В ответе — массив резюме. У каждого есть поле <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">"id"</code> — это и есть Resume ID.</div>
          </Step>
        </div>

        <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-[var(--neon-violet)]/8 border border-[var(--neon-violet)]/20 text-xs font-mono text-[var(--neon-violet)]">
          <Shield size={13} className="shrink-0 mt-0.5" />
          Если у вас несколько резюме, используйте то, которое наиболее актуально для целевой должности. Отклики будут отправляться именно с него.
        </div>
      </div>
    )},
    { id: "sources", icon: <Globe size={16} />, title: "Источники вакансий — все бесплатные", accent: "var(--neon-cyan)", content: (
      <div className="space-y-4">
        <p className="text-sm text-foreground/70 leading-relaxed">
          HuntPulse собирает вакансии из 7 источников через публичные API и RSS-фиды — без платных подписок, регистраций и парсинга. Отклики отправляются только через HH.ru, остальные источники используются для <strong>обнаружения вакансий</strong>.
        </p>

        <div className="space-y-2">
          {(Object.entries(JOB_SOURCES) as [JobSource, typeof JOB_SOURCES[JobSource]][]).map(([id, s]) => (
            <div key={id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.bg} border ${s.border}`}>
                  <Globe size={12} className={s.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-sm font-semibold font-mono ${s.color}`}>{s.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s.geo}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">Бесплатно</span>
                  </div>
                  <p className="text-xs text-foreground/60 leading-relaxed mb-1.5">{s.desc}</p>
                  {(s.rss || s.api) && (
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {s.rss && <span className="mr-2">📡 RSS</span>}
                      {s.api && <span>🔌 API</span>}
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className={`ml-2 ${s.color} hover:underline`}>{s.url.replace("https://", "")}</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-muted/50 p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Как работает агрегация</div>
          <div className="space-y-2 text-xs text-foreground/65 leading-relaxed">
            <div className="flex gap-2"><span className="text-[var(--neon-violet)] shrink-0">1.</span><span>Все источники опрашиваются параллельно через CORS-прокси (rss2json.com, allorigins.win) или напрямую через их публичные API.</span></div>
            <div className="flex gap-2"><span className="text-[var(--neon-violet)] shrink-0">2.</span><span>Вакансии нормализуются в единый формат и дедуплицируются по названию + компании.</span></div>
            <div className="flex gap-2"><span className="text-[var(--neon-violet)] shrink-0">3.</span><span>Совпадения с вашими критериями (должность, зарплата, локация) фильтруются ИИ.</span></div>
            <div className="flex gap-2"><span className="text-[var(--neon-violet)] shrink-0">4.</span><span>Отклики отправляются только на HH.ru — на вакансии, найденные там. По остальным источникам открывается ссылка для ручного отклика.</span></div>
          </div>
        </div>
      </div>
    )},
    { id: "flow", icon: <Zap size={16} />, title: "Как работает HuntPulse AI", accent: "var(--neon-violet)", content: (
      <div className="space-y-2">
        {[
          { icon: <Plus size={14} />, label: "Добавление позиции", text: "Вводите HH-токен, Resume ID, должность и параметры поиска." },
          { icon: <Globe size={14} />, label: "Агрегация источников", text: "7 бесплатных источников — HH.ru, Habr Career, Djinni, RemoteOK и другие." },
          { icon: <CheckCircle size={14} />, label: "Дедупликация", text: "Вакансии из локальной истории автоматически пропускаются." },
          { icon: <Bot size={14} />, label: "Генерация письма", text: "AI-провайдер создаёт персонализированное письмо до 800 символов." },
          { icon: <BrainCircuit size={14} />, label: "Автопилот или контроль", text: "Выберите режим: автоматическая отправка или проверка каждого отклика." },
          { icon: <History size={14} />, label: "История", text: "Все отклики сохраняются с текстом письма, источником и статусом." },
        ].map((item, i) => (
          <div key={i} className="flex gap-3 px-3 py-3 rounded-xl border border-border bg-background">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(139,92,246,0.12)", color: "var(--neon-violet)" }}>{item.icon}</div>
            <div><div className="text-xs font-mono font-semibold text-foreground mb-0.5">{item.label}</div><div className="text-xs text-foreground/65 leading-relaxed">{item.text}</div></div>
          </div>
        ))}
      </div>
    )},
  ];

  return (
    <motion.div key="guide" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
      <div className="max-w-2xl">
        <div className="mb-5">
          <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "Oxanium, monospace" }}>Руководство</h2>
          <p className="text-xs font-mono text-muted-foreground">Пошаговые инструкции по получению всех бесплатных API-ключей</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {(["gemini", "groq", "openrouter"] as Provider[]).map(p => {
            const pr = PROVIDERS[p];
            return (
              <button key={p} onClick={() => setOpenSection(p)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${openSection === p ? "border-[var(--neon-violet)]/50 bg-[var(--neon-violet)]/8" : "border-border bg-card hover:border-[var(--neon-violet)]/30"}`}>
                <span className="text-[var(--neon-violet)] opacity-70">{pr.icon}</span>
                <span className="text-[10px] font-mono text-foreground/70 leading-tight">{pr.label}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${pr.badgeColor}`}>{pr.badge}</span>
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {sections.map(sec => (
            <div key={sec.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button className="w-full flex items-center gap-3 px-5 py-4 text-left group hover:bg-muted/30 transition-colors min-h-[56px]"
                onClick={() => setOpenSection(openSection === sec.id ? null : sec.id)}>
                <span style={{ color: sec.accent }} className="opacity-70 group-hover:opacity-100 transition-opacity shrink-0">{sec.icon}</span>
                <span className="flex-1 text-sm font-semibold text-foreground flex items-center flex-wrap gap-1" style={{ fontFamily: "Oxanium, monospace" }}>{sec.title}{"extra" in sec ? sec.extra : null}</span>
                <span className="text-muted-foreground shrink-0">{openSection === sec.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
              </button>
              <AnimatePresence>
                {openSection === sec.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-5 pb-5 border-t border-border pt-4">{sec.content}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-[var(--neon-violet)]/30 bg-[var(--neon-violet)]/5 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold text-sm mb-1" style={{ fontFamily: "Oxanium, monospace" }}>Готовы начать?</div>
            <div className="text-xs font-mono text-muted-foreground">Все ключи получены — идём в настройки</div>
          </div>
          <button onClick={onGoToSettings}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all min-h-[44px]"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 16px rgba(139,92,246,0.35)" }}>
            К настройкам <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
