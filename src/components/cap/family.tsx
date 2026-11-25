import { Clock, Home, ListChecks, User, Wallet, type LucideIcon } from "lucide-react";
import type { CauseFamily } from "@/lib/domain/types";

export const FAMILY_ICONS: Record<CauseFamily, LucideIcon> = {
  moi: User,
  temps: Clock,
  environnement: Home,
  moyens: Wallet,
  methode: ListChecks,
};

export function FamilyIcon({ family, size = 20 }: { family: CauseFamily; size?: number }) {
  const Icon = FAMILY_ICONS[family];
  return <Icon size={size} aria-hidden="true" />;
}
