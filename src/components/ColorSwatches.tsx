import { PROJECT_COLORS } from "@/lib/colors";

type Props = { value: string; used: string[]; onPick: (color: string) => void };

/** Renders the project palette as clickable dots; colors already in use are dimmed. */
export function ColorSwatches({ value, used, onPick }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Projektfärg">
      {PROJECT_COLORS.map(c => (
        <button key={c} type="button" role="radio" aria-checked={c === value} onClick={() => onPick(c)}
          className={`size-5 rounded-full transition ${c === value ? "ring-2 ring-offset-2 ring-foreground" : used.includes(c) ? "opacity-35 hover:opacity-100" : "hover:scale-110"}`}
          style={{ background: c }} />
      ))}
    </div>
  );
}
