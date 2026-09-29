import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

interface ModeToggleProps {
  align?: "center" | "end" | "start";
}

const OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export const SidebarModeToggle = ({ align = "center" }: ModeToggleProps) => {
  const { theme, setTheme } = useTheme();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="sm"
          // El tooltip sólo hace falta cuando el texto no se ve; forzarlo
          // duplicaba la palabra «Tema» al lado de la palabra «Tema».
          tooltip="Tema"
          className="w-full cursor-pointer overflow-hidden font-semibold"
        >
          <span className={cn("mr-auto truncate", isCollapsed && "hidden")}>
            Tema
          </span>
          <span className="relative flex items-center justify-center">
            <Sun className="size-4 rotate-0 scale-100 origin-left transition-all duration-700 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 origin-right transition-all duration-700 dark:rotate-0 dark:scale-100" />
          </span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className="cursor-pointer"
            onClick={() => setTheme(option.value)}
          >
            <option.icon className="size-4" />
            {option.label}
            {theme === option.value && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
