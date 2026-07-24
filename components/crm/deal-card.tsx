"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import type { DealWithRelations } from "@/lib/types";

export function DealCard({ deal }: { deal: DealWithRelations }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 10 : undefined }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab touch-none gap-2 py-3 active:cursor-grabbing"
    >
      <CardContent className="flex flex-col gap-1 px-3">
        <Link
          href={`/crm/negocios/${deal.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-medium hover:underline"
        >
          {deal.account.nombre}
        </Link>
        {deal.contact && (
          <span className="text-muted-foreground text-xs">{deal.contact.nombre}</span>
        )}
        {deal.amount != null && (
          <span className="text-xs font-medium tabular-nums">
            {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
              deal.amount
            )}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
