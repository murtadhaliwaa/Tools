import { Badge } from "@/components/ui/badge";
import { ItemStatus, ItemStatusLabel, TransactionTypeLabel } from "@/types/domain";
import type { ItemStatus as ItemStatusType } from "@/types/domain";
import type { TransactionType } from "@/generated/prisma/client";

export function StatusBadge({ status }: { status: ItemStatusType }) {
  const variant =
    status === ItemStatus.AVAILABLE
      ? "default"
      : status === ItemStatus.IN_REPAIR
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{ItemStatusLabel[status]}</Badge>;
}

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  return <Badge variant="outline">{TransactionTypeLabel[type]}</Badge>;
}
