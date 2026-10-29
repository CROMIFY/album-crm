import { CalendarView } from "@/components/calendar/calendar-view";
import { fetchCalendarData } from "@/lib/queries/calendar";
import { todayInMadrid } from "@/lib/tasks/filters";

export default async function CalendarioPage() {
  const { tasks, sprints, profiles } = await fetchCalendarData();

  return <CalendarView tasks={tasks} sprints={sprints} profiles={profiles} today={todayInMadrid()} />;
}
