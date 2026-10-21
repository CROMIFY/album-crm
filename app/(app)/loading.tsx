import { Skeleton } from "@/components/ui/skeleton";

// Se pinta al instante al navegar entre módulos mientras el servidor
// resuelve las consultas de la página, en vez de dejar la pantalla anterior
// congelada.
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
