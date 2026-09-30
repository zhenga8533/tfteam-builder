import type { ComponentProps } from "react";
import type { Augment, Champion, Item, Trait } from "@/lib/data/schema";
import type { TraitStyle } from "@/lib/game/traits";
import { cn } from "@/lib/utils";
import { COST_RING, TRAIT_BG } from "./styles";

type ImgProps = Omit<ComponentProps<"img">, "src" | "alt">;

function GameImage({ src, alt, className, ...props }: ImgProps & { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn("bg-muted object-cover select-none", className)}
      {...props}
    />
  );
}

export function ChampionIcon({ champion, className, ...props }: ImgProps & { champion: Champion }) {
  return (
    <GameImage
      src={champion.icon}
      alt={champion.name}
      className={cn("aspect-square rounded-md ring-2", COST_RING[champion.cost], className)}
      {...props}
    />
  );
}

export function ItemIcon({ item, className, ...props }: ImgProps & { item: Item }) {
  return <GameImage src={item.icon} alt={item.name} className={cn("aspect-square rounded-sm", className)} {...props} />;
}

export function AugmentIcon({ augment, className, ...props }: ImgProps & { augment: Augment }) {
  return (
    <GameImage
      src={augment.icon}
      alt={augment.name}
      className={cn("aspect-square rounded-md bg-transparent", className)}
      {...props}
    />
  );
}

const HEX_CLIP = "[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]";

export function TraitIcon({
  trait,
  style = "inactive",
  className,
}: {
  trait: Trait;
  style?: TraitStyle;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex aspect-[0.88] size-7 shrink-0 items-center justify-center",
        HEX_CLIP,
        TRAIT_BG[style],
        className,
      )}
    >
      <img
        src={trait.icon}
        alt={trait.name}
        loading="lazy"
        draggable={false}
        className={cn("size-[62%] select-none", style === "inactive" ? "opacity-60" : "brightness-0")}
      />
    </span>
  );
}
