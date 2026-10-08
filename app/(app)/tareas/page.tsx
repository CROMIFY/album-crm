import { cookies } from "next/headers";
import { TaskBoard } from "@/components/tasks/task-board";
import { createClient } from "@/lib/supabase/server";
import { fetchBoard } from "@/lib/queries/tasks";
import { COLUMN_PREFS_COOKIE, parseColumnPrefs } from "@/lib/tasks/columns";
import { todayInMadrid } from "@/lib/tasks/filters";

export default async function TareasPage() {
  const supabase = await createClient();
  const [{ columns, tasks, labels, profiles, accounts }, { data: userData }, cookieStore] = await Promise.all([
    fetchBoard(),
    supabase.auth.getUser(),
    cookies(),
  ]);

  return (
    <TaskBoard
      columns={columns}
      tasks={tasks}
      labels={labels}
      profiles={profiles}
      accounts={accounts}
      today={todayInMadrid()}
      currentUserId={userData.user?.id ?? null}
      columnPrefs={parseColumnPrefs(cookieStore.get(COLUMN_PREFS_COOKIE)?.value)}
    />
  );
}
