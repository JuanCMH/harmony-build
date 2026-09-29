import type { Id } from "@/convex/_generated/dataModel";
import { useGenerateUploadUrl } from "@/hooks/use-generate-upload-url";
import { logError } from "@/lib/logging";
import { useState } from "react";
import { toast } from "sonner";

/** Tope del logo. Por encima, el navegador tarda y la subida falla sin avisar. */
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/** Si el fichero sirve como logo. Avisa de por qué no, cuando no. */
export const isValidLogo = (file: File) => {
  if (!file.type.startsWith("image/")) {
    toast.error("El logo debe ser una imagen");
    return false;
  }
  if (file.size > MAX_LOGO_BYTES) {
    toast.error("La imagen no puede pesar más de 5 MB");
    return false;
  }
  return true;
};

/**
 * Sube el logo de un proyecto al almacenamiento.
 *
 * Se sube al **guardar**, no al elegir el fichero: subirlo antes dejaba una
 * imagen huérfana en el almacenamiento cada vez que alguien elegía un logo y
 * cancelaba el formulario.
 */
export const useLogoUpload = () => {
  const { mutate: generateUploadUrl } = useGenerateUploadUrl();
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File): Promise<Id<"_storage"> | null> => {
    setIsUploading(true);
    try {
      const url = await generateUploadUrl({}, { throwError: true });
      if (!url) throw new Error("No se generó la URL de subida");

      const result = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) {
        logError(
          "project.logo_upload_rejected",
          new Error(await result.text()),
          {
            status: result.status,
          },
        );
        toast.error("No se pudo subir el logo. Inténtalo de nuevo");
        return null;
      }

      const { storageId } = (await result.json()) as {
        storageId: Id<"_storage">;
      };
      return storageId;
    } catch (error) {
      logError("project.logo_upload", error);
      toast.error("No se pudo subir el logo. Inténtalo de nuevo");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
};
