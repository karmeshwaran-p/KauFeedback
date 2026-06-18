import { Star } from "lucide-react";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
}

export function StarRating({ label, value, onChange, error }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="text-xs text-muted-foreground">
          {value > 0 ? `${value}/5` : "Not rated"}
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= value
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
