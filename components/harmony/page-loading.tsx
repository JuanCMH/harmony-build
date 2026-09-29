import { cn } from "@/lib/utils";

interface PageLoadingProps {
    icon: React.ComponentType<{ className?: string }>;
    text?: string;
    iconSpin?: boolean;
    className?: string;
}

export const PageLoading = ({ icon: Icon, text, iconSpin, className }: PageLoadingProps) => {

    const iconClasses = `size-5 text-muted-foreground ${iconSpin ? 'animate-spin' : ''}`.trim();
    return (
        // `py-10` porque esto no siempre llena una pantalla: dentro de un
        // `SettingsCard` el contenedor se ajusta al contenido y el bloque
        // colapsaba a 66px, con el icono rozando el borde de la tarjeta. A
        // pantalla completa no cambia nada, que ahí manda el `justify-center`.
        //
        // Se fueron tres clases muertas: `bg-background-foreground` no es un
        // token que exista, y `md:mr-2 rounded-tr-xl` era residuo de cuando
        // esto ocupaba el panel entero y se pegaba al borde de la ventana.
        <div className={cn("h-full flex-1 flex flex-col items-center justify-center gap-2 py-10", className)}>
            <Icon className={iconClasses} />
            <span className="text-center text-sm text-muted-foreground max-w-sm">
                {text}
            </span>
        </div>
    );
}