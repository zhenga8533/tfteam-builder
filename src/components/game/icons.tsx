import type { ComponentProps } from "react";
import type { Augment, Champion, Item, Trait } from "@/lib/data/schema";
import type { TraitStyle } from "@/lib/game/traits";
import { cn } from "@/lib/utils";
import { COST_RING } from "./styles";

type ImgProps = Omit<ComponentProps<"img">, "src" | "alt"> & {
  /** The name is already shown as text next to the icon, so screen readers skip the image instead of repeating it. */
  decorative?: boolean;
};

function GameImage({ src, alt, decorative, className, ...props }: ImgProps & { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={decorative ? "" : alt}
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

/** The in-game trait badge: a hexagonal metal frame and face (bronze, silver, gold…) with the trait's icon. */
export function TraitIcon({
  trait,
  style = "inactive",
  className,
  decorative,
}: {
  trait: Trait;
  style?: TraitStyle;
  className?: string;
  /** The name is already shown as text next to the badge. */
  decorative?: boolean;
}) {
  return (
    <span
      className={cn("hex-clip relative inline-flex aspect-[0.88] size-7 shrink-0", `trait-frame-${style}`, className)}
    >
      <span className={cn("hex-clip absolute inset-[9%] flex items-center justify-center", `trait-face-${style}`)}>
        <img
          src={trait.icon}
          alt={decorative ? "" : trait.name}
          loading="lazy"
          draggable={false}
          className={cn(
            "size-[64%] select-none",
            style === "inactive" ? "opacity-70" : "brightness-0 drop-shadow-[0_1px_0_rgb(255_255_255/0.25)]",
          )}
        />
      </span>
    </span>
  );
}
