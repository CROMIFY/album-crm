"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeaderPortal } from "@/components/header-portal";
import { NewMeetingDialog } from "@/components/crm/new-meeting-dialog";
import { MeetingsCalendar } from "@/components/crm/meetings-calendar";
import { MEETING_STATUS_LABELS } from "@/lib/types";
import type {
  AccountRow,
  ContactRow,
  DealRow,
  MeetingStatus,
  MeetingWithRelations,
  ProfileRow,
} from "@/lib/types";

const STATUS_VARIANT: Record<MeetingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  programada: "default",
  completada: "secondary",
  cancelada: "destructive",
  no_show: "outline",
};

export function MeetingsView({
  upcoming,
  past,
  calendarMeetings,
  currentMonth,
  profiles,
  accounts,
  contacts,
  deals,
  filters,
}: {
  upcoming: MeetingWithRelations[];
  past: MeetingWithRelations[];
  calendarMeetings: MeetingWithRelations[];
  currentMonth: string;
  profiles: ProfileRow[];
  accounts: AccountRow[];
  contacts: ContactRow[];
  deals: DealRow[];
  filters: { profileId?: string; accountId?: string; status?: MeetingStatus };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "none") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <HeaderPortal>
        <NewMeetingDialog accounts={accounts} contacts={contacts} deals={deals} profiles={profiles} />
      </HeaderPortal>
      <h1 className="text-lg font-semibold">Reuniones</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={filters.profileId ?? "none"} onValueChange={(v) => setFilter("profileId", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos los usuarios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Todos los usuarios</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.accountId ?? "none"} onValueChange={(v) => setFilter("accountId", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las cuentas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Todas las cuentas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.status ?? "none"} onValueChange={(v) => setFilter("status", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Todos los estados</SelectItem>
            {(Object.keys(MEETING_STATUS_LABELS) as MeetingStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {MEETING_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="proximas">
        <TabsList>
          <TabsTrigger value="proximas">Próximas</TabsTrigger>
          <TabsTrigger value="pasadas">Pasadas</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
        </TabsList>
        <TabsContent value="proximas" className="pt-3">
          <MeetingList meetings={upcoming} emptyLabel="No hay reuniones próximas." />
        </TabsContent>
        <TabsContent value="pasadas" className="pt-3">
          <MeetingList meetings={past} emptyLabel="No hay reuniones pasadas." />
        </TabsContent>
        <TabsContent value="calendario" className="pt-3">
          <MeetingsCalendar meetings={calendarMeetings} currentMonth={currentMonth} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MeetingList({
  meetings,
  emptyLabel,
}: {
  meetings: MeetingWithRelations[];
  emptyLabel: string;
}) {
  if (meetings.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <Link href={`/crm/reuniones/${meeting.id}`}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{meeting.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(meeting.starts_at).toLocaleString("es-ES")}
                    {meeting.account ? ` · ${meeting.account.nombre}` : " · Interna"}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[meeting.status]}>
                  {MEETING_STATUS_LABELS[meeting.status]}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
