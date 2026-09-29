import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Normaliza lo que se teclea: el servidor genera el código en minúsculas y lo
 *  compara exacto, así que copiarlo a mano —con mayúsculas o con un espacio
 *  colado al final— tiene que seguir funcionando. */
const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

interface JoinCodeFieldProps {
  id: string;
  label: string;
  /** Longitud exacta del código que genera el servidor. */
  codeLength: number;
  value: string;
  onChange: (joinCode: string) => void;
  disabled?: boolean;
}

/**
 * Campo para pegar un código de unión.
 *
 * Es un campo de texto y no una fila de casillas: acepta la longitud real del
 * código y cabe en un teléfono, que doce casillas no.
 */
export const JoinCodeField = ({
  id,
  label,
  codeLength,
  value,
  onChange,
  disabled,
}: JoinCodeFieldProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      required
      value={value}
      disabled={disabled}
      minLength={codeLength}
      maxLength={codeLength}
      autoCapitalize="none"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      placeholder={"·".repeat(codeLength)}
      className="h-12 text-center font-mono text-lg font-semibold tracking-[0.2em]"
      onChange={(e) => onChange(normalize(e.target.value))}
    />
    <p className="text-xs text-muted-foreground">
      {codeLength} caracteres, tal como aparecen en la invitación.
    </p>
  </div>
);
