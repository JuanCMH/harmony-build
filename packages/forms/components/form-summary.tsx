import { Badge } from "@/components/ui/badge";
import type { FormStatus } from "@/convex/lib/form_types";

import {
  STATUS_TONE_CLASS,
  type StatusBadge,
  UNPUBLISHED_CHANGES_BADGE,
  formStatusBadge,
  hasUnpublishedChanges,
} from "../lib/status";

interface FormSummaryProps {
  form: {
    status: FormStatus;
    publishedVersionNumber: number | null;
    hasDraftChanges: boolean;
    code?: string;
    categoryName: string | null;
  };
}

/**
 * El estado del formato y su código, en una línea sobre su tabla. El nombre
 * ya está en las migas (`03 §2.2`): aquí va lo que las migas no dicen.
 */
export const FormSummary = ({ form }: FormSummaryProps) => {
  const badges: StatusBadge[] = [
    formStatusBadge(form),
    ...(hasUnpublishedChanges(form) ? [UNPUBLISHED_CHANGES_BADGE] : []),
  ];
  const details = [form.code, form.categoryName].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {badges.map((badge) => (
        <Badge
          key={badge.label}
          variant="outline"
          className={STATUS_TONE_CLASS[badge.tone]}
        >
          {badge.label}
        </Badge>
      ))}
      {details ? (
        <span className="text-ui tabular-nums text-muted-foreground">
          {details}
        </span>
      ) : null}
    </div>
  );
};
