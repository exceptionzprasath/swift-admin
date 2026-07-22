// Lightweight event bus so the SWIFT AI copilot can guide any form on the page.
// The copilot (in "guide" mode) subscribes to `question` requests and pushes
// answers back via `answer`. Live notifications flow through `notify`.

type GuideQuestion = {
  id: string;
  scope: string; // e.g. "employee-registration"
  field: string;
  prompt: string;
  suggestions?: string[];
  kind?: "text" | "number" | "choice" | "yesno" | "date";
};
type GuideAnswer = { id: string; value: string };
type GuideNotify = { title: string; body?: string; kind?: "info" | "success" | "rule" | "warn" };
type GuideMode = { active: boolean; scope?: string; context?: Record<string, unknown> };

type Handler<T> = (payload: T) => void;

class Bus<T> {
  private handlers = new Set<Handler<T>>();
  on(h: Handler<T>) { this.handlers.add(h); return () => this.handlers.delete(h); }
  emit(p: T) { this.handlers.forEach((h) => h(p)); }
}

export const aiGuide = {
  ask: new Bus<GuideQuestion>(),
  answer: new Bus<GuideAnswer>(),
  notify: new Bus<GuideNotify>(),
  mode: new Bus<GuideMode>(),
};

let pending = new Map<string, (v: string) => void>();

aiGuide.answer.on((a) => {
  const cb = pending.get(a.id);
  if (cb) { cb(a.value); pending.delete(a.id); }
});

export function askAiField(q: Omit<GuideQuestion, "id">): Promise<string> {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    pending.set(id, resolve);
    aiGuide.ask.emit({ ...q, id });
  });
}

export function aiNotify(n: GuideNotify) { aiGuide.notify.emit(n); }
export function setAiGuideMode(m: GuideMode) { aiGuide.mode.emit(m); }
