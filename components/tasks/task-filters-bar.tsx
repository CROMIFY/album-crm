"use client";

import { ArrowUpDown, CalendarDays, ChevronDown, Flag, RotateCcw, Tags, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DUE_FILTER_LABELS,
  EMPTY_FILTERS,
  NONE,
  SORT_OPTIONS,
  countActiveFilters,
  type DueFilter,
  type SortOption,
  type TaskFilters,
} from "@/lib/tasks/filters";
import { cn } from "@/lib/utils";
import type { LabelRow, ProfileRow, TaskPriority } from "@/lib/types";

type Option = { value: string; label: string; color?: string };

const PRIORITY_OPTIONS: Option[] = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

function CountPill({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] leading-4 font-semibold tabular-nums">
      {count}
    </span>
  );
}

function triggerClass(active: boolean) {
  return cn(active && "border-primary/60 bg-accent");
}

function MultiFilter({
  label,
  icon,
  options,
  noneOption,
  selected,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  options: Option[];
  /** Opción especial (p. ej. "Sin asignar") que va primero, separada del resto. */
  noneOption?: Option;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(value: string, checked: boolean) {
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));
  }

  function renderItem(option: Option) {
    return (
      <DropdownMenuCheckboxItem
        key={option.value}
        checked={selected.includes(option.value)}
        onCheckedChange={(checked) => toggle(option.value, checked)}
        // Que el menú siga abierto para marcar varias opciones seguidas.
        onSelect={(e) => e.preventDefault()}
      >
        {option.color && (
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
        )}
        {option.label}
      </DropdownMenuCheckboxItem>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClass(selected.length > 0)}>
          {icon}
          {label}
          <CountPill count={selected.length} />
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 min-w-48 overflow-y-auto">
        {noneOption && renderItem(noneOption)}
        {noneOption && options.length > 0 && <DropdownMenuSeparator />}
        {options.map(renderItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DueFilterControl({
  filters,
  onChange,
}: {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
}) {
  const active = countActiveFilters({ ...EMPTY_FILTERS, due: filters.due, from: filters.from, to: filters.to }) > 0;
  const presets = Object.keys(DUE_FILTER_LABELS) as Exclude<DueFilter, "rango">[];

  function setPreset(preset: Exclude<DueFilter, "rango">) {
    onChange({ ...filters, due: filters.due === preset ? null : preset, from: null, to: null });
  }

  function setRange(patch: { from?: string | null; to?: string | null }) {
    const from = patch.from !== undefined ? patch.from : filters.from;
    const to = patch.to !== undefined ? patch.to : filters.to;
    onChange({ ...filters, due: from || to ? "rango" : null, from, to });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClass(active)}>
          <CalendarDays />
          Fecha
          <CountPill count={active ? 1 : 0} />
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="flex flex-col gap-1">
          {presets.map((preset) => (
            <Button
              key={preset}
              variant={filters.due === preset ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={filters.due === preset}
              className="justify-start"
              onClick={() => setPreset(preset)}
            >
              {DUE_FILTER_LABELS[preset]}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t pt-2.5">
          <span className="text-muted-foreground text-xs font-medium">Rango de fechas límite</span>
          <div className="flex items-center gap-2">
            <Label htmlFor="tasks-filter-from" className="w-11 shrink-0 text-xs">
              Desde
            </Label>
            <Input
              id="tasks-filter-from"
              type="date"
              value={filters.from ?? ""}
              max={filters.to ?? undefined}
              onChange={(e) => setRange({ from: e.target.value || null })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="tasks-filter-to" className="w-11 shrink-0 text-xs">
              Hasta
            </Label>
            <Input
              id="tasks-filter-to"
              type="date"
              value={filters.to ?? ""}
              min={filters.from ?? undefined}
              onChange={(e) => setRange({ to: e.target.value || null })}
            />
          </div>
        </div>
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground justify-start"
            onClick={() => onChange({ ...filters, due: null, from: null, to: null })}
          >
            Quitar filtro de fecha
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TaskFiltersBar({
  filters,
  onChange,
  profiles,
  labels,
  currentUserId,
  visibleCount,
  totalCount,
}: {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  profiles: ProfileRow[];
  labels: LabelRow[];
  currentUserId: string | null;
  visibleCount: number;
  totalCount: number;
}) {
  const activeCount = countActiveFilters(filters);
  const dirty = activeCount > 0 || filters.sort !== "manual";
  // Atajo del filtro de usuario: activo solo si el filtro es exactamente «yo».
  const onlyMine = currentUserId !== null && filters.assignees.length === 1 && filters.assignees[0] === currentUserId;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2" role="toolbar" aria-label="Filtros y orden de las tareas">
      {currentUserId && (
        <Button
          variant="outline"
          size="sm"
          aria-pressed={onlyMine}
          className={triggerClass(onlyMine)}
          onClick={() => onChange({ ...filters, assignees: onlyMine ? [] : [currentUserId] })}
        >
          <UserRound />
          Mis tareas
        </Button>
      )}
      <MultiFilter
        label="Usuario"
        icon={<Users />}
        noneOption={{ value: NONE, label: "Sin asignar" }}
        options={profiles.map((p) => ({ value: p.id, label: p.nombre }))}
        selected={filters.assignees}
        onChange={(assignees) => onChange({ ...filters, assignees })}
      />
      <MultiFilter
        label="Etiquetas"
        icon={<Tags />}
        noneOption={{ value: NONE, label: "Sin etiqueta" }}
        options={labels.map((l) => ({ value: l.id, label: l.name, color: l.color }))}
        selected={filters.labels}
        onChange={(next) => onChange({ ...filters, labels: next })}
      />
      <MultiFilter
        label="Prioridad"
        icon={<Flag />}
        options={PRIORITY_OPTIONS}
        selected={filters.priorities}
        onChange={(next) => onChange({ ...filters, priorities: next as TaskPriority[] })}
      />
      <DueFilterControl filters={filters} onChange={onChange} />

      <Select value={filters.sort} onValueChange={(sort) => onChange({ ...filters, sort: sort as SortOption })}>
        <SelectTrigger size="sm" aria-label="Ordenar tareas" className={cn("w-52", triggerClass(filters.sort !== "manual"))}>
          <ArrowUpDown className="text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {dirty && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onChange(EMPTY_FILTERS)}>
          <RotateCcw />
          Restablecer
        </Button>
      )}
      {activeCount > 0 && (
        <span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
          Mostrando {visibleCount} de {totalCount} tareas
        </span>
      )}
    </div>
  );
}
