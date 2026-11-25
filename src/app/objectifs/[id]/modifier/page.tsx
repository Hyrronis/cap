import { GoalWizard } from "@/components/cap/goal-wizard";

export const metadata = { title: "Modifier l'objectif" };

export default async function ModifierObjectifPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GoalWizard goalId={id} />;
}
