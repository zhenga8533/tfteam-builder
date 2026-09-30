import { Fragment, useMemo } from "react";
import { type DescriptionToken, formatNumber, parseDescription, type VariableResolver } from "@/lib/game/description";
import { cn } from "@/lib/utils";
import { StatIcon } from "./stat-icon";
import { statFromMarkup } from "./stats";
import { TEXT_STYLE_CLASS } from "./styles";

interface GameTextProps {
  desc: string;
  resolve?: VariableResolver;
  /** For per-star ability values: which star level to emphasize (values are indexed by star). */
  star?: number;
  className?: string;
}

function Value({ values, star }: { values: number[] | null; star?: number }) {
  if (!values) return <span className="text-muted-foreground">?</span>;
  if (values.length === 1) return <>{formatNumber(values[0]!)}</>;

  // Ability arrays are indexed by star level; index 0 is an unused 0★ entry.
  const perStar = values.slice(1, 4);
  if (perStar.every((value) => value === perStar[0])) return <>{formatNumber(perStar[0]!)}</>;
  return (
    <span>
      {perStar.map((value, index) => (
        <Fragment key={index}>
          {index > 0 && <span className="text-muted-foreground">/</span>}
          <span className={cn(star !== undefined && star !== index + 1 && "opacity-50")}>{formatNumber(value)}</span>
        </Fragment>
      ))}
    </span>
  );
}

function Token({ token, star }: { token: DescriptionToken; star?: number }) {
  switch (token.type) {
    case "text":
      return <span className={token.style && TEXT_STYLE_CLASS[token.style]}>{token.text}</span>;
    case "stat": {
      const stat = statFromMarkup(token.stat);
      return stat ? <StatIcon stat={stat} /> : null;
    }
    case "value":
      return (
        <span className={cn("font-semibold", token.style && TEXT_STYLE_CLASS[token.style])}>
          <Value values={token.values} star={star} />
        </span>
      );
  }
}

export function GameText({ desc, resolve, star, className }: GameTextProps) {
  const lines = useMemo(() => parseDescription(desc, resolve), [desc, resolve]);

  return (
    <div className={cn("space-y-1 text-sm leading-relaxed", className)}>
      {lines.map((line, lineIndex) =>
        line.length === 0 ? (
          <div key={lineIndex} className="h-1" />
        ) : (
          <p key={lineIndex}>
            {line.map((token, tokenIndex) => (
              <Token key={tokenIndex} token={token} star={star} />
            ))}
          </p>
        ),
      )}
    </div>
  );
}
