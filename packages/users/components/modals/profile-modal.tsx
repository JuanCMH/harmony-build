import { useGenerateUploadUrl } from "@/hooks/use-generate-upload-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HarmonyModal,
  HarmonyModalHeader,
  HarmonyModalContent,
  HarmonyModalFooter,
  DialogClose,
} from "@/components/harmony/harmony-modal";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { fullDate } from "@/lib/date-formats";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import { useUpdateUserImage, useUpdateUserName } from "../../api";
import { User } from "../../types";
import { Calendar as CalendarIcon, Pencil, User as UserIcon } from "lucide-react";

/** Tope de la foto de perfil. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ProfileModalProps = {
  open: boolean;
  user: User;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

export function ProfileModal({ open, setOpen, user }: ProfileModalProps) {
  const [editNameOpen, setEditNameOpen] = useState(false);

  const [userName, setUserName] = useState<string>(user.name || "");

  const { mutate: updateUserName, isPending: isUpdatingUserName } =
    useUpdateUserName();

  const { mutate: updateUserImage, isPending: isUpdatingUserImage } =
    useUpdateUserImage();

  const { mutate: generateUploadUrl, isPending: isGeneratingUploadUrl } =
    useGenerateUploadUrl();

  const avatarFallback = user.name!.charAt(0).toUpperCase();
  const isBusy = isUpdatingUserImage || isGeneratingUploadUrl;

  const handleUpdateName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userName) {
      toast.error("No se ha ingresado ningún nombre");
      return;
    }
    updateUserName(
      {
        name: userName,
      },
      {
        onSuccess() {
          toast.success("Nombre actualizado correctamente");
          setEditNameOpen(false);
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  const handleUpdateImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("La foto debe ser una imagen");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("La imagen no puede pesar más de 5 MB");
      return;
    }

    const url = await generateUploadUrl({}, { throwError: true });
    if (!url) {
      toast.error("Error al generar la URL de la imagen");
      return;
    }

    const result = await fetch(url, {
      body: file,
      method: "POST",
      headers: { "Content-Type": file.type },
    });
    if (!result.ok) {
      toast.error("Error al subir la imagen");
      return;
    }

    const { storageId } = await result.json();

    updateUserImage(
      {
        newImageId: storageId,
      },
      {
        onSuccess() {
          toast.success("Imagen de usuario actualizada correctamente");
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };
  return (
    <>
      <HarmonyModal open={open} onOpenChange={setOpen}>
        <HarmonyModalHeader
          icon={UserIcon}
          title="Perfil"
          description="Aquí puedes ver y editar tu información."
        />
        <HarmonyModalContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 break-all">
                <h4 className="text-sm font-semibold">{user.name}</h4>
                <Button
                  variant="ghost"
                  onClick={() => setEditNameOpen(true)}
                  size="iconSm"
                  className="p-1"
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
              <p className="text-sm">{user.email}</p>
              <div className="flex items-center pt-2">
                <CalendarIcon className="mr-2 size-4 text-muted-foreground" />{" "}
                <span className="text-xs text-muted-foreground">
                  Te uniste el {fullDate(new Date(user._creationTime))}
                </span>
              </div>
            </div>
            {/* El input es el control real; el avatar es su etiqueta. Antes
                era un `<button>` sin nombre accesible que buscaba el input por
                un `id` que otros dos modales también usan. */}
            <label
              htmlFor="profile-image-input"
              className={cn(
                "cursor-pointer rounded-full transition-opacity hover:opacity-80",
                isBusy && "pointer-events-none opacity-50",
              )}
            >
              <span className="sr-only">Cambiar la foto de perfil</span>
              <Avatar className="size-16">
                <AvatarImage
                  src={user.userImage}
                  alt={user.name}
                  className="object-cover"
                />
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
            </label>
            <input
              id="profile-image-input"
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={isBusy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) await handleUpdateImage(file);
              }}
            />
          </div>
        </HarmonyModalContent>
      </HarmonyModal>
      <HarmonyModal open={editNameOpen} onOpenChange={setEditNameOpen}>
        <HarmonyModalHeader
          icon={Pencil}
          title="Cambiar nombre"
          description="Modifica tu nombre de usuario."
        />
        <form id="edit-name-form" onSubmit={handleUpdateName}>
          <HarmonyModalContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                required
                minLength={4}
                maxLength={40}
                value={userName}
                disabled={isUpdatingUserName}
                placeholder="Nombre de usuario"
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
          </HarmonyModalContent>
          <HarmonyModalFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isUpdatingUserName}>
              {isUpdatingUserName ? "Guardando…" : "Guardar"}
            </Button>
          </HarmonyModalFooter>
        </form>
      </HarmonyModal>
    </>
  );
}
