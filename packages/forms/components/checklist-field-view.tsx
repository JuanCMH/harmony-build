import type {
  ChecklistAnswer,
  ChecklistConfig,
  ChecklistMeaning,
} from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";

import {
  answerableItems,
  answersByItem,
  checklistProgress,
  optionByValue,
} from "../lib/checklist";
import {
  MEANING_DOT,
  MEANING_LABEL,
  MEANING_TINT,
} from "../lib/checklist-styles";
import { shortDateEs } from "../lib/date-value";

interface ChecklistFieldViewProps {
  config: ChecklistConfig;
  value: readonly ChecklistAnswer[];
}

const MEANINGS: ChecklistMeaning[] = ["ok", "fail", "na"];

/**
 * Una lista de chequeo respondida, para leerla.
 *
 * Primero lo que quien revisa viene a buscar: cuántos no conformes y cuáles,
 * con su observación. Debajo, la lista entera, en dos columnas cuando la
 * pantalla las da: sesenta ítems apilados en una sola son tres pantallas de
 * desplazamiento para no leer nada nuevo.
 */
export const ChecklistFieldView = ({
  config,
  value,
}: ChecklistFieldViewProps) => {
  const answers = answersByItem(value);
  const progress = checklistProgress(config, value);
  const unanswered = progress.total - progress.answered;

  const findings = config.blocks.flatMap((block) =>
    answerableItems(block).flatMap((item) => {
      const answer = answers.get(item.id);
      const option = optionByValue(config, answer?.value);
      return option?.meaning === "fail"
        ? [{ block, item, answer, option }]
        : [];
    }),
  );

  const showBlockTitles =
    config.blocks.length > 1 || Boolean(config.blocks[0]?.label);

  return (
    <div className="space-y-4">
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        {MEANINGS.map((meaning) => {
          const count = progress.byMeaning[meaning];
          return (
            <div key={meaning} className="flex items-baseline gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-2 self-center rounded-full",
                  MEANING_DOT[meaning],
                )}
              />
              <dd className="text-xl font-medium tabular-nums">{count}</dd>
              <dt className="text-ui text-muted-foreground">
                {MEANING_LABEL[meaning][count === 1 ? "one" : "many"]}
              </dt>
            </div>
          );
        })}
        {unanswered > 0 && (
          <div className="flex items-baseline gap-2">
            <dd className="text-xl font-medium tabular-nums">{unanswered}</dd>
            <dt className="text-ui text-muted-foreground">sin responder</dt>
          </div>
        )}
      </dl>

      {findings.length > 0 && (
        <section className="overflow-clip rounded-lg border border-red-500/20">
          <h4 className="border-b border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400">
            {findings.length === 1
              ? "1 hallazgo"
              : `${findings.length} hallazgos`}
          </h4>
          <ul className="divide-y divide-border/60">
            {findings.map(({ block, item, answer, option }) => (
              <li key={item.id} className="space-y-1 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-snug">{item.label}</p>
                  <AnswerTag label={option.label} meaning={option.meaning} />
                </div>
                {showBlockTitles && block.label && (
                  <p className="text-xs text-muted-foreground">{block.label}</p>
                )}
                {answer?.note && <p className="text-ui">{answer.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="gap-4 lg:columns-2">
        {config.blocks.map((block, index) => (
          <section
            key={block.id}
            className="mb-4 break-inside-avoid overflow-clip rounded-lg border bg-card"
          >
            {showBlockTitles && (
              <h4 className="border-b bg-muted px-3 py-2 text-sm font-medium">
                {block.label || `Bloque ${index + 1}`}
              </h4>
            )}
            <ul className="divide-y divide-border/60">
              {block.items.map((item) => {
                if (item.heading)
                  return (
                    <li
                      key={item.id}
                      className="px-3 pt-2 pb-1 text-ui font-medium text-muted-foreground"
                    >
                      {item.label}
                    </li>
                  );

                const answer = answers.get(item.id);
                const option = optionByValue(config, answer?.value);
                const extras = [
                  answer?.quantity !== undefined && config.quantity
                    ? `${config.quantity.label}: ${answer.quantity}`
                    : null,
                  answer?.date && config.date
                    ? `${config.date.label}: ${shortDateEs(answer.date)}`
                    : null,
                ].filter((extra): extra is string => extra !== null);

                return (
                  <li
                    key={item.id}
                    className={cn(
                      "space-y-1 px-3 py-2",
                      item.indented && "pl-6",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-ui leading-snug">{item.label}</p>
                      {option ? (
                        <AnswerTag
                          label={option.short}
                          title={option.label}
                          meaning={option.meaning}
                        />
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Sin responder
                        </span>
                      )}
                    </div>
                    {extras.length > 0 && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {extras.join(" · ")}
                      </p>
                    )}
                    {answer?.note && option?.meaning !== "fail" && (
                      <p className="text-xs text-muted-foreground">
                        {answer.note}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

const AnswerTag = ({
  label,
  title,
  meaning,
}: {
  label: string;
  title?: string;
  meaning: ChecklistMeaning;
}) => (
  <span
    title={title}
    className={cn(
      "shrink-0 rounded-sm border px-1.5 py-0.5 text-xs font-medium",
      MEANING_TINT[meaning],
    )}
  >
    {label}
  </span>
);
