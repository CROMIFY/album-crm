import { CalendarView } from "@/components/calendar/calendar-view";
import { GoalsSummary } from "@/components/goals/goals-view";
import { fetchCalendarData } from "@/lib/queries/calendar";
import { fetchGoalsData } from "@/lib/queries/goals";
import { todayInMadrid } from "@/lib/tasks/filters";

export default async function CalendarioPage() {
  const [{ tasks, sprints, profiles }, { goals }] = await Promise.all([fetchCalendarData(), fetchGoalsData()]);
  const today = todayInMadrid();

  return (
    <CalendarView
      tasks={tasks}
      sprints={sprints}
      profiles={profiles}
      today={today}
      header={<GoalsSummary goals={goals} today={today} />}
    />
  );
}
