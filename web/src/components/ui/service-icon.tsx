import {
  BadgeCheck, BadgeInfo, Building2, ContactRound, FileCheck2, Handshake,
  Landmark, LockKeyhole, ShieldCheck, Ship, UsersRound, WalletCards
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  building: Building2,
  landmark: Landmark,
  users: UsersRound,
  "badge-check": BadgeCheck,
  handshake: Handshake,
  "shield-check": ShieldCheck,
  "badge-info": BadgeInfo,
  "file-check": FileCheck2,
  "lock-keyhole": LockKeyhole,
  ship: Ship,
  "contact-round": ContactRound,
  "wallet-cards": WalletCards
};

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name as keyof typeof icons] ?? Building2;
  return <span className={cn("grid size-12 place-items-center rounded-2xl bg-alt-mint text-primary", className)}><Icon className="size-5" aria-hidden="true" /></span>;
}
