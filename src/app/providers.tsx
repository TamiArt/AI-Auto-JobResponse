import { Cpu, Globe, Sparkles } from "lucide-react";
import type { Provider } from "./model";

export const PROVIDERS: Record<Provider, {
  label: string;
  badge: string;
  badgeColor: string;
  model: string;
  icon: JSX.Element;
  placeholder: string;
}> = {
  gemini: { label: "Google Gemini", badge: "Бесплатный тариф", badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", model: "gemini-1.5-flash", icon: <Sparkles size={14} />, placeholder: "AIza..." },
  groq: { label: "Groq (Llama 3)", badge: "Бесплатный тариф", badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", model: "llama-3.1-8b-instant", icon: <Cpu size={14} />, placeholder: "gsk_..." },
  openrouter: { label: "OpenRouter", badge: ":free модели", badgeColor: "text-violet-400 bg-violet-400/10 border-violet-400/30", model: "llama-3.1-8b:free", icon: <Globe size={14} />, placeholder: "sk-or_..." },
};
