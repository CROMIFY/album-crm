import { GoalsView } from "@/components/goals/goals-view";
import { fetchGoalsData } from "@/lib/queries/goals";
import { todayInMadrid } from "@/lib/tasks/filters";

export default async function ObjetivosPage() {
  const { goals, profiles, missingTable } = await fetchGoalsData();

  return <GoalsView goals={goals} profiles={profiles} today={todayInMadrid()} missingTable={missingTable} />;
}
