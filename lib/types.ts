export type AccountType = "club" | "patrocinador";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  club: "club",
  patrocinador: "patrocinador",
};

export const ACCOUNT_TYPE_LABELS_PLURAL: Record<AccountType, string> = {
  club: "Clubes",
  patrocinador: "Patrocinadores",
};

export type SponsorScope = "global" | "local";
export type SponsorLevel = "nivel_1" | "nivel_2" | "nivel_3";

export const SPONSOR_SCOPE_LABELS: Record<SponsorScope, string> = {
  global: "Global",
  local: "Local",
};

export const SPONSOR_LEVEL_LABELS: Record<SponsorLevel, string> = {
  nivel_1: "Nivel 1",
  nivel_2: "Nivel 2",
  nivel_3: "Nivel 3",
};

export const SPONSOR_LEVELS: SponsorLevel[] = ["nivel_1", "nivel_2", "nivel_3"];

export const PROVINCIAS_ESPANA: string[] = [
  "Álava",
  "Albacete",
  "Alicante",
  "Almería",
  "Asturias",
  "Ávila",
  "Badajoz",
  "Barcelona",
  "Burgos",
  "Cáceres",
  "Cádiz",
  "Cantabria",
  "Castellón",
  "Ciudad Real",
  "Córdoba",
  "Cuenca",
  "Gerona",
  "Granada",
  "Guadalajara",
  "Guipúzcoa",
  "Huelva",
  "Huesca",
  "Islas Baleares",
  "Jaén",
  "La Coruña",
  "La Rioja",
  "Las Palmas",
  "León",
  "Lérida",
  "Lugo",
  "Madrid",
  "Málaga",
  "Murcia",
  "Navarra",
  "Orense",
  "Palencia",
  "Pontevedra",
  "Salamanca",
  "Santa Cruz de Tenerife",
  "Segovia",
  "Sevilla",
  "Soria",
  "Tarragona",
  "Teruel",
  "Toledo",
  "Valencia",
  "Valladolid",
  "Vizcaya",
  "Zamora",
  "Zaragoza",
  "Ceuta",
  "Melilla",
];

export type DealStage =
  | "busqueda"
  | "cadencia"
  | "contacto"
  | "agendada"
  | "demo"
  | "negociacion"
  | "ganado"
  | "aplazado"
  | "perdido";

export const DEAL_STAGES: DealStage[] = [
  "busqueda",
  "cadencia",
  "contacto",
  "agendada",
  "demo",
  "negociacion",
  "ganado",
  "aplazado",
  "perdido",
];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  busqueda: "Búsqueda",
  cadencia: "Cadencia",
  contacto: "Contacto",
  agendada: "Agendada",
  demo: "Presentación",
  negociacion: "Acuerdo y condiciones",
  ganado: "Ganado",
  aplazado: "Aplazado",
  perdido: "Perdido",
};

export const DEAL_STAGE_DESCRIPTIONS: Record<DealStage, string> = {
  busqueda: "Se buscan posibles clientes y se recopilan los datos necesarios para operar.",
  cadencia: "Intentos de contacto hasta que conseguimos ese contacto o se acaba la secuencia.",
  contacto: "Fase en la que hablamos para agendar reunión.",
  agendada: "Reunión de presentación en la que hablamos del problema y se agenda la propuesta.",
  demo: "Se presenta la propuesta y cómo encaja con sus necesidades.",
  negociacion: "Se acuerdan las condiciones (comisión, exclusividad, alcance) antes de cerrar.",
  ganado: "Cliente cerrado.",
  aplazado: "No es el momento, pero quiere retomarlo la próxima temporada.",
  perdido: "El negocio no salió adelante.",
};

export const DEFAULT_CADENCE_TEMPLATE: { label: string; action: string }[] = [
  { label: "Día 1", action: "Llamada" },
  { label: "Día 3", action: "Email" },
  { label: "Día 5", action: "Llamada" },
  { label: "Día 8", action: "WhatsApp" },
  { label: "Día 10", action: "Llamada" },
];

export type TaskPriority = "baja" | "media" | "alta";

// Nota: estas Row types deben declararse con `type`, no `interface` — TypeScript
// solo infiere una firma de índice implícita en object-type literals, no en
// interfaces, y supabase-js exige que cada Row sea asignable a Record<string, unknown>.

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  created_at: string;
};

export type AccountRow = {
  id: string;
  tipo: AccountType;
  nombre: string;
  telefono: string | null;
  email: string | null;
  web: string | null;
  external_club_id: number | null;
  owner_name: string | null;
  provincia: string | null;
  alcance: SponsorScope | null;
  nivel: SponsorLevel | null;
  created_at: string;
};

export type ContactRow = {
  id: string;
  account_id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  created_at: string;
};

export type DealRow = {
  id: string;
  account_id: string;
  contact_id: string | null;
  stage: DealStage;
  stage_entered_at: string;
  lost_reason: string | null;
  amount: number | null;
  created_at: string;
  updated_at: string;
};

export type DealStageHistoryRow = {
  id: string;
  deal_id: string;
  from_stage: DealStage | null;
  to_stage: DealStage;
  changed_at: string;
};

export type CadenceStepRow = {
  id: string;
  deal_id: string;
  label: string;
  action: string;
  done: boolean;
  done_at: string | null;
  position: number;
};

export type BoardColumnRow = {
  id: string;
  name: string;
  position: number;
  is_done_column: boolean;
  created_at: string;
};

export type LabelRow = {
  id: string;
  name: string;
  color: string;
};

export type TaskRow = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  position: number;
  done: boolean;
  linked_account_id: string | null;
  linked_deal_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskLabelRow = {
  task_id: string;
  label_id: string;
};

export type TaskAssigneeRow = {
  task_id: string;
  profile_id: string;
};

export type SubtaskRow = {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
};

export type NotificationLogRow = {
  id: string;
  event_type: string;
  channel: string | null;
  target: string | null;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
};

export type MeetingStatus = "programada" | "completada" | "cancelada" | "no_show";

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  programada: "Programada",
  completada: "Completada",
  cancelada: "Cancelada",
  no_show: "No show",
};

export type MeetingRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  meet_link: string | null;
  google_calendar_event_id: string | null;
  status: MeetingStatus;
  cancel_reason: string | null;
  linked_account_id: string | null;
  linked_contact_id: string | null;
  linked_deal_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingAttendeeRow = {
  id: string;
  meeting_id: string;
  profile_id: string | null;
  contact_id: string | null;
  created_at: string;
};

export type MeetingNoteRow = {
  id: string;
  meeting_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type MeetingActionItemRow = {
  id: string;
  meeting_id: string;
  title: string;
  done: boolean;
  assignee_id: string | null;
  due_date: string | null;
  linked_task_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type GoogleCalendarTokenRow = {
  profile_id: string;
  access_token: string;
  refresh_token: string;
  scope: string;
  token_expiry: string;
  created_at: string;
  updated_at: string;
};

// Vistas "con relaciones" para selects con embedding de Supabase. El cliente
// tipado no conoce las foreign keys reales (no generamos tipos desde un
// proyecto Supabase vivo), así que estas queries se castean explícitamente a
// estos tipos en vez de depender del parser de embeds de supabase-js.
export type DealWithRelations = DealRow & {
  account: AccountRow;
  contact: ContactRow | null;
};

export type TaskWithRelations = TaskRow & {
  labels: LabelRow[];
  subtasks: SubtaskRow[];
  assignees: ProfileRow[];
};

export type MeetingWithRelations = MeetingRow & {
  account: AccountRow | null;
  contact: ContactRow | null;
  deal: DealRow | null;
  attendees: (MeetingAttendeeRow & {
    profile: ProfileRow | null;
    contact: ContactRow | null;
  })[];
  notes: MeetingNoteRow[];
  actionItems: MeetingActionItemRow[];
};

type Insertable<R, Optional extends keyof R = never> = Omit<
  R,
  "id" | "created_at" | "updated_at" | Optional
> &
  Partial<Pick<R, Extract<Optional, keyof R>>>;

export type Database = {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_type: AccountType;
      deal_stage: DealStage;
      task_priority: TaskPriority;
      sponsor_scope: SponsorScope;
      sponsor_level: SponsorLevel;
      meeting_status: MeetingStatus;
    };
    Tables: {
      profiles: Table<ProfileRow, Insertable<ProfileRow, "rol">, Partial<ProfileRow>>;
      accounts: Table<
        AccountRow,
        Insertable<
          AccountRow,
          | "telefono"
          | "email"
          | "web"
          | "external_club_id"
          | "owner_name"
          | "provincia"
          | "alcance"
          | "nivel"
        >,
        Partial<AccountRow>
      >;
      contacts: Table<
        ContactRow,
        Insertable<ContactRow, "telefono" | "email">,
        Partial<ContactRow>
      >;
      deals: Table<
        DealRow,
        Insertable<DealRow, "stage" | "stage_entered_at" | "contact_id" | "lost_reason" | "amount">,
        Partial<DealRow>
      >;
      deal_stage_history: Table<
        DealStageHistoryRow,
        Insertable<DealStageHistoryRow>,
        Partial<DealStageHistoryRow>
      >;
      cadence_steps: Table<
        CadenceStepRow,
        Insertable<CadenceStepRow, "done" | "done_at" | "position">,
        Partial<CadenceStepRow>
      >;
      board_columns: Table<
        BoardColumnRow,
        Insertable<BoardColumnRow, "position" | "is_done_column">,
        Partial<BoardColumnRow>
      >;
      labels: Table<LabelRow, Omit<LabelRow, "id">, Partial<LabelRow>>;
      tasks: Table<
        TaskRow,
        Insertable<
          TaskRow,
          | "description"
          | "due_date"
          | "priority"
          | "position"
          | "done"
          | "linked_account_id"
          | "linked_deal_id"
        >,
        Partial<TaskRow>
      >;
      task_labels: Table<TaskLabelRow, TaskLabelRow, Partial<TaskLabelRow>>;
      task_assignees: Table<TaskAssigneeRow, TaskAssigneeRow, Partial<TaskAssigneeRow>>;
      subtasks: Table<
        SubtaskRow,
        Insertable<SubtaskRow, "done" | "position">,
        Partial<SubtaskRow>
      >;
      notification_log: Table<
        NotificationLogRow,
        Insertable<NotificationLogRow, "channel" | "target" | "payload" | "status">,
        Partial<NotificationLogRow>
      >;
      meetings: Table<
        MeetingRow,
        Insertable<
          MeetingRow,
          | "description"
          | "location"
          | "meet_link"
          | "google_calendar_event_id"
          | "status"
          | "cancel_reason"
          | "linked_account_id"
          | "linked_contact_id"
          | "linked_deal_id"
          | "created_by"
        >,
        Partial<MeetingRow>
      >;
      meeting_attendees: Table<
        MeetingAttendeeRow,
        Insertable<MeetingAttendeeRow, "profile_id" | "contact_id">,
        Partial<MeetingAttendeeRow>
      >;
      meeting_notes: Table<
        MeetingNoteRow,
        Insertable<MeetingNoteRow, "author_id">,
        Partial<MeetingNoteRow>
      >;
      meeting_action_items: Table<
        MeetingActionItemRow,
        Insertable<
          MeetingActionItemRow,
          "done" | "assignee_id" | "due_date" | "linked_task_id" | "position"
        >,
        Partial<MeetingActionItemRow>
      >;
      google_calendar_tokens: Table<
        GoogleCalendarTokenRow,
        Insertable<GoogleCalendarTokenRow>,
        Partial<GoogleCalendarTokenRow>
      >;
    };
  };
};
