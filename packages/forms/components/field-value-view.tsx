import { fieldText } from "@/convex/lib/field_text";
import type {
  ChecklistAnswer,
  FormField,
  TableRow,
} from "@/convex/lib/form_types";
import {
  isEmptyValue,
  isFileValue,
  isReferenceValue,
  isSignatureValue,
} from "@/convex/lib/stored_values";
import { isEmail, isPhone, isUrl } from "@/convex/lib/value_validation";

import { isImportExempt } from "@/convex/lib/import_types";
import type { ValueViewContext } from "../lib/response-reading";
import { ChecklistFieldView } from "./checklist-field-view";
import { EmptyValue, UnavailableValue } from "./empty-value";
import { FileValueView } from "./file-value-view";
import { ReferenceValueView } from "./reference-value-view";
import { SignatureValueView } from "./signature-value-view";
import { TableValueView } from "./table-value-view";

interface FieldValueViewProps {
  field: FormField;
  /** El valor en memoria (`fromStoredValue`), o nada. */
  value: unknown;
  context: ValueViewContext;
}

const LINK_CLASS =
  "rounded-sm text-sm break-all underline underline-offset-4 hover:no-underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * El valor de un campo, para leerlo. Texto, no un control deshabilitado: un
 * `input` en gris se lee peor que una frase, y no se puede seleccionar en el
 * teléfono.
 *
 * Lo que es texto lo escribe `fieldText`, el mismo que escribe la columna del
 * listado y la instantánea de una relación: un valor se lee igual en los tres
 * sitios.
 */
export const FieldValueView = ({
  field,
  value,
  context,
}: FieldValueViewProps) => {
  if (isEmptyValue(field, value)) {
    return context.imported && isImportExempt(field) ? (
      <UnavailableValue />
    ) : (
      <EmptyValue />
    );
  }

  switch (field.type) {
    case "checklist":
      return field.config.checklist && Array.isArray(value) ? (
        <ChecklistFieldView
          config={field.config.checklist}
          value={value as ChecklistAnswer[]}
        />
      ) : (
        <EmptyValue />
      );

    case "table":
      return field.config.table && Array.isArray(value) ? (
        <TableValueView
          config={field.config.table}
          rows={value as TableRow[]}
          context={context}
        />
      ) : (
        <EmptyValue />
      );

    case "signature":
      return isSignatureValue(value) ? (
        <SignatureValueView
          value={value}
          url={context.fileUrls.get(value.storageId)}
        />
      ) : (
        <EmptyValue />
      );

    case "file":
    case "image":
      return isFileValue(value) ? (
        <FileValueView
          value={value}
          url={context.fileUrls.get(value.storageId)}
          kind={field.type}
        />
      ) : (
        <EmptyValue />
      );

    case "reference":
      return isReferenceValue(value) ? (
        <ReferenceValueView
          value={value}
          href={
            field.config.reference
              ? context.entryHref(
                  field.config.reference.formId,
                  value.responseId,
                )
              : undefined
          }
        />
      ) : (
        <EmptyValue />
      );

    case "textarea":
      return (
        <p className="text-sm break-words whitespace-pre-wrap">
          {fieldText(field, value)}
        </p>
      );

    // Un enlace sólo se hace pulsable si es de verdad un enlace: lo que se
    // guardó antes de que el servidor validara se enseña como texto.
    case "url": {
      const text = fieldText(field, value).trim();
      return isUrl(text) ? (
        <a
          href={text}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {text}
        </a>
      ) : (
        <p className="text-sm break-all">{text}</p>
      );
    }

    case "email": {
      const text = fieldText(field, value).trim();
      return isEmail(text) ? (
        <a href={`mailto:${text}`} className={LINK_CLASS}>
          {text}
        </a>
      ) : (
        <p className="text-sm break-all">{text}</p>
      );
    }

    case "phone": {
      const text = fieldText(field, value).trim();
      return isPhone(text) ? (
        <a href={`tel:${text.replace(/[^\d+]/g, "")}`} className={LINK_CLASS}>
          {text}
        </a>
      ) : (
        <p className="text-sm break-words">{text}</p>
      );
    }

    case "number":
    case "currency":
    case "date":
    case "time":
      return <p className="text-sm tabular-nums">{fieldText(field, value)}</p>;

    default:
      return <p className="text-sm break-words">{fieldText(field, value)}</p>;
  }
};
