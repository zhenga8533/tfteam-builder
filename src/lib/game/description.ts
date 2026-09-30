export type TextStyle = "magic" | "physical" | "true" | "keyword" | "bonus" | "muted";

export type DescriptionToken =
  | { type: "text"; text: string; style?: TextStyle }
  | { type: "stat"; stat: string }
  /** `values` holds one entry per star level for abilities, or a single entry otherwise; `null` is unresolvable. */
  | { type: "value"; values: number[] | null; style?: TextStyle };

export type DescriptionLine = DescriptionToken[];

/** Looks up a variable by name; returns undefined when the data doesn't define it. */
export type VariableResolver = (name: string) => number | number[] | undefined;

const TAG_STYLES: Record<string, TextStyle> = {
  magicdamage: "magic",
  physicaldamage: "physical",
  truedamage: "true",
  tftkeyword: "keyword",
  keyword: "keyword",
  tftbold: "keyword",
  bright: "keyword",
  tfthighlight: "keyword",
  tftbonus: "bonus",
  scalehealth: "bonus",
  scalelevel: "bonus",
  tftradiantitembonus: "bonus",
  rules: "muted",
  tftrules: "muted",
  tftitemrules: "muted",
  dim: "muted",
};

const BLOCK_TAGS = new Set(["row", "expandrow", "li"]);

const TOKEN_PATTERN = /<(\/?)([A-Za-z]+)[^>]*>|%i:([A-Za-z]+)%|@([^@]+)@/g;

function resolveValue(expression: string, resolve: VariableResolver): number[] | null {
  const [name = "", multiplier] = expression.split("*");
  // Unit-property references (e.g. `TFTUnitProperty.:Foo`) can't be resolved from static data.
  if (name.includes(":")) return null;
  const raw = resolve(name);
  if (raw === undefined) return null;
  const scale = multiplier ? Number(multiplier) : 1;
  return (Array.isArray(raw) ? raw : [raw]).map((value) => value * scale);
}

/**
 * Parses Riot's tooltip markup (custom tags, `%i:stat%` icons, `@Variable@` placeholders)
 * into styled lines that can be rendered without injecting HTML.
 */
export function parseDescription(desc: string, resolve: VariableResolver = () => undefined): DescriptionLine[] {
  const source = desc
    .replace(/&nbsp;/g, " ")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\r?\n|\\n/g, "<br>");

  const lines: DescriptionLine[] = [[]];
  const styleStack: TextStyle[] = [];
  const currentStyle = () => styleStack.at(-1);
  const push = (token: DescriptionToken) => lines.at(-1)!.push(token);
  const pushText = (text: string) => {
    if (!text) return;
    const style = currentStyle();
    const previous = lines.at(-1)!.at(-1);
    if (previous?.type === "text" && previous.style === style) previous.text += text;
    else push({ type: "text", text, style });
  };

  let cursor = 0;
  for (const match of source.matchAll(TOKEN_PATTERN)) {
    pushText(source.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    const [, closing, tag, stat, variable] = match;

    if (tag) {
      const name = tag.toLowerCase();
      if (name === "br") {
        lines.push([]);
      } else if (BLOCK_TAGS.has(name)) {
        if (lines.at(-1)!.length > 0) lines.push([]);
      } else if (name in TAG_STYLES) {
        if (closing) styleStack.pop();
        else styleStack.push(TAG_STYLES[name]!);
      }
    } else if (stat) {
      push({ type: "stat", stat });
    } else if (variable) {
      push({ type: "value", values: resolveValue(variable, resolve), style: currentStyle() });
    }
  }
  pushText(source.slice(cursor));

  return trimLines(lines);
}

function trimLines(lines: DescriptionLine[]): DescriptionLine[] {
  const cleaned = lines.map((line) => {
    const first = line[0];
    if (first?.type === "text") first.text = first.text.trimStart();
    const last = line.at(-1);
    if (last?.type === "text") last.text = last.text.trimEnd();
    return line.filter((token) => token.type !== "text" || token.text);
  });
  // Collapse runs of blank lines into a single paragraph gap and drop blank edges.
  const collapsed = cleaned.filter((line, index) => line.length > 0 || (index > 0 && cleaned[index - 1]!.length > 0));
  while (collapsed.at(-1)?.length === 0) collapsed.pop();
  return collapsed;
}

/** Creates a case-insensitive resolver, since Riot's variable casing is inconsistent between text and data. */
export function createResolver(...sources: Record<string, number | number[]>[]): VariableResolver {
  const lookup = new Map<string, number | number[]>();
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) lookup.set(key.toLowerCase(), value);
  }
  return (name) => lookup.get(name.toLowerCase());
}

export function formatNumber(value: number): string {
  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 100) / 100;
  return String(rounded);
}
