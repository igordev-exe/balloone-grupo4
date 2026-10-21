import { KitIcon } from "./Kit";

export type Toast = { id: number; tone: "cyan" | "amber" | "red" | "grey"; title: string; body: string };

const ICON = { cyan: "check", amber: "warn", red: "warn", grey: "settings" } as const;

/** Toast message do kit: canto em colchete, barra lateral colorida, título com sublinhado. */
export function Toasts({ items, dismiss }: { items: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`ktoast tone-${t.tone}`} role="status">
          <KitIcon name={ICON[t.tone]} size={18} />
          <div>
            <b>{t.title}</b>
            <span>{t.body}</span>
          </div>
          <button className="toast-close" aria-label="Fechar aviso" onClick={() => dismiss(t.id)}>
            <KitIcon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
