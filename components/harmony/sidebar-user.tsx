"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, useSignOut } from "@/packages/auth/api";
import { ProfileModal } from "@/packages/users/components/modals/profile-modal";
import { ChevronsUpDown, User, X } from "lucide-react";
import { useState } from "react";

export function SidebarUser() {
  const { isMobile } = useSidebar();
  const signOut = useSignOut();
  const { data: user } = useCurrentUser();
  const [profileOpen, setProfileOpen] = useState(false);

  // Sin usuario, la fila no se va: desaparecer y volver mueve el pie del
  // sidebar 48px justo al acabar de cargar (`03 §2.4`).
  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            className="flex h-12 items-center gap-2 px-2"
            aria-busy="true"
            aria-live="polite"
          >
            <span className="sr-only">Cargando tu cuenta…</span>
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const avatarFallback = user.name!.charAt(0).toUpperCase();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.userImage} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-h-rose text-white font-bold">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.userImage} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-h-rose">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setProfileOpen(true)}
                className="flex items-center justify-between gap-2 cursor-pointer"
              >
                Perfil
                <User className="size-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => signOut()}
                className="flex items-center justify-between gap-2 cursor-pointer"
              >
                Cerrar sesión
                <X className="size-4 ml-2" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <ProfileModal open={profileOpen} setOpen={setProfileOpen} user={user} />
    </>
  );
}
