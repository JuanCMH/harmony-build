import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** El logo de un proyecto o, si no tiene, la inicial de su nombre. */
export const ProjectAvatar = ({
  name,
  logoImage,
  className,
  fallbackClassName,
}: {
  name: string | undefined;
  logoImage: string | undefined;
  className?: string;
  fallbackClassName?: string;
}) => (
  <Avatar className={cn("rounded-md border", className)}>
    {/* `alt` vacío: el nombre va siempre escrito al lado. */}
    <AvatarImage src={logoImage} alt="" className="object-cover" />
    <AvatarFallback className={cn("rounded-md", fallbackClassName)}>
      {name?.charAt(0).toUpperCase() || "P"}
    </AvatarFallback>
  </Avatar>
);
