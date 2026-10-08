import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, Sparkles, Swords, Users } from "lucide-react";
import { NotFoundState, SearchButton } from "@/components/layout/not-found-state";
import { Button } from "@/components/ui/button";
import { useActiveSet } from "@/lib/data/hooks";
import { setOfApiName } from "@/lib/game/api-names";
import { useSettings } from "@/stores/settings";

const KINDS = {
  champion: { noun: "Champion", plural: "champions", to: "/champions", icon: Users },
  item: { noun: "Item", plural: "items", to: "/items", icon: Swords },
  trait: { noun: "Trait", plural: "traits", to: "/traits", icon: Sparkles },
} as const;

/**
 * A champion, item or trait page whose entry isn't in the selected set. When its apiName says which set it's from and
 * the site has that set, it offers to switch, as comp guides do.
 */
export function MissingEntry({ kind, apiName }: { kind: keyof typeof KINDS; apiName: string }) {
  const { noun, plural, to, icon } = KINDS[kind];
  const { set, sets } = useActiveSet();
  const setActiveSet = useSettings((state) => state.setSet);
  const home = setOfApiName(apiName);
  const other = home !== undefined && home !== set && sets.includes(home) ? home : undefined;
  return (
    <NotFoundState
      icon={icon}
      title={`${noun} not found`}
      description={
        other
          ? `This ${noun.toLowerCase()} is from Set ${other}, but you're viewing Set ${set}.`
          : `Set ${set} has no ${noun.toLowerCase()} at this address. It may belong to another set, or the link may be out of date.`
      }
    >
      {other && (
        <Button onClick={() => setActiveSet(other === sets[0] ? null : other)}>
          <ArrowLeftRight /> Switch to Set {other}
        </Button>
      )}
      <Button asChild variant={other ? "outline" : "default"}>
        <Link to={to}>Browse {plural}</Link>
      </Button>
      <SearchButton />
    </NotFoundState>
  );
}
