"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Shield,
  Handshake,
  KanbanSquare,
  CalendarClock,
  Receipt,
  Rocket,
  Bug,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm/clubes", label: "Clubes", icon: Shield },
  { href: "/crm/patrocinios", label: "Patrocinios", icon: Handshake },
  { href: "/tareas", label: "Tareas", icon: KanbanSquare },
  { href: "/crm/reuniones", label: "Reuniones", icon: CalendarClock },
  { href: "/crm/gastos", label: "Gastos", icon: Receipt },
  { href: "/crm/deploys", label: "Deploys", icon: Rocket },
  { href: "/crm/errores", label: "Errores", icon: Bug },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3">
        <span className="text-sidebar-foreground text-sm font-semibold tracking-tight">
          AlbumCromos CRM
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Ventas y tareas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
