"use client";

import { GripVertical } from "lucide-react";
import { DRAG_HANDLE_ATTR } from "@/lib/dnd/sensors";

/**
 * Asa para arrastrar una tarjeta con el dedo (solo en pantallas táctiles). Es la
 * única zona con touch-action:none: el resto de la tarjeta deja hacer scroll.
 * Con ratón no hace falta: se arrastra desde cualquier parte de la tarjeta.
 */
export function DragHandle({ itemName }: { itemName: string }) {
  return (
    <span
      {...{ [DRAG_HANDLE_ATTR]: "" }}
      role="img"
      aria-label={`Mantén pulsado para arrastrar «${itemName}»`}
      onClick={(e) => e.stopPropagation()}
      className="text-muted-foreground -my-1 hidden h-7 w-6 shrink-0 touch-none items-center justify-center rounded pointer-coarse:inline-flex"
    >
      <GripVertical className="h-4 w-4" />
    </span>
  );
}
