import { TaskBoard } from "@/components/tasks/task-board";
import { fetchBoard } from "@/lib/queries/tasks";
import { todayInMadrid } from "@/lib/tasks/filters";

export default async function TareasPage() {
  const { columns, tasks, labels, profiles, accounts } = await fetchBoard();

  return (
    <TaskBoard
      columns={columns}
      tasks={tasks}
      labels={labels}
      profiles={profiles}
      accounts={accounts}
      today={todayInMadrid()}
    />
  );
}
