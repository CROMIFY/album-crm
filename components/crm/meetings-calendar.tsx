"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MeetingListItem, MeetingStatus } from "@/lib/types";

const STATUS_VARIANT: Record<MeetingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  programada: "default",
  completada: "secondary",
  cancelada: "destructive",
  no_show: "outline",
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_VISIBLE_PER_DAY = 3;

export function MeetingsCalendar({
  meetings,
  currentMonth,
}: {
  meetings: MeetingListItem[];
  currentMonth: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const month = new Date(currentMonth);

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function goToMonth(target: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", format(target, "yyyy-MM"));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => goToMonth(subMonths(month, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: es })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => goToMonth(addMonths(month, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-muted text-muted-foreground p-1.5 text-center font-medium">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const dayMeetings = meetings.filter((m) => isSameDay(new Date(m.starts_at), day));
          const visible = dayMeetings.slice(0, MAX_VISIBLE_PER_DAY);
          const overflow = dayMeetings.length - visible.length;

          return (
            <div
              key={day.toISOString()}
              className={`bg-background flex min-h-24 flex-col gap-1 p-1.5 ${
                isSameMonth(day, month) ? "" : "opacity-40"
              }`}
            >
              <span
                className={`self-start text-[11px] ${
                  isToday(day) ? "bg-primary text-primary-foreground rounded-full px-1.5" : "text-muted-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5">
                {visible.map((m) => (
                  <Link
                    key={m.id}
                    href={`/crm/reuniones/${m.id}`}
                    className="hover:bg-muted truncate rounded px-1 py-0.5"
                    title={m.title}
                  >
                    <Badge variant={STATUS_VARIANT[m.status]} className="max-w-full">
                      <span className="truncate">{m.title}</span>
                    </Badge>
                  </Link>
                ))}
                {overflow > 0 && (
                  <span className="text-muted-foreground px-1 text-[11px]">+{overflow} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
