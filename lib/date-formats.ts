import { format } from "date-fns";
import { es } from "date-fns/locale";

export const fullDateTime = (date: Date) =>
  format(date, "dd/MM/yy HH:mm", { locale: es });
export const shortDateTime = (date: Date) =>
  format(date, "dd/MM HH:mm", { locale: es });
export const fullDate = (date: Date) =>
  format(date, "dd/MM/yy", { locale: es });
export const shortDate = (date: Date) => format(date, "dd/MM", { locale: es });
export const fullMonth = (date: Date) => format(date, "MMMM", { locale: es });
export const shortMonth = (date: Date) => format(date, "MMM", { locale: es });
export const fullTime = (date: Date) => format(date, "HH:mm", { locale: es });
export const shortTime = (date: Date) => format(date, "HH", { locale: es });
