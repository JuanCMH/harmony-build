import { describe, expect, it } from "vitest";
import type { PendingFile, PendingSignature } from "../file-value";
import {
  collectPendingFiles,
  hasPendingFiles,
  PENDING_STORAGE_ID,
  type UploadCache,
  uploadPendingFiles,
  withUploadPlaceholders,
} from "../upload-pending-files";

const file = (name: string, type = "image/png") =>
  new File(["contenido"], name, { type });

const pendingFile = (name: string, type?: string): PendingFile => ({
  file: file(name, type),
  name,
});

const pendingSignature = (
  signerName: string,
  signerDocument?: string,
): PendingSignature => ({
  file: file(`firma-${signerName}.png`),
  name: `firma-${signerName}.png`,
  signerName,
  ...(signerDocument ? { signerDocument } : {}),
});

/** Un almacenamiento de mentira: responde un `storageId` por subida y guarda
 *  lo que se le pidió. */
const fakeStorage = (failOn?: string) => {
  const requests: { url: string; type: string; name: string }[] = [];
  let urls = 0;
  const send = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body as File;
    const headers = init?.headers as Record<string, string>;
    requests.push({
      url: String(url),
      type: headers["Content-Type"],
      name: body.name,
    });
    if (body.name === failOn) return new Response("", { status: 500 });
    return Response.json({ storageId: `almacen-${body.name}` });
  }) as typeof fetch;
  const generateUrl = async () => {
    urls += 1;
    return `https://subida.test/${urls}`;
  };
  return { send, generateUrl, requests };
};

const delivery = () => ({
  trabajador: { responseId: "r1", label: "Ana Ruiz", snapshot: [] },
  foto: pendingFile("casco.jpg", "image/jpeg"),
  firma: pendingSignature("Juan Pérez"),
  elementos: [
    {
      rowId: "fila-1",
      cells: [
        { columnId: "detalle", value: "Casco" },
        { columnId: "recibido", value: pendingSignature("Ana Ruiz", "1020") },
        { columnId: "evidencia", value: pendingFile("entrega.png") },
      ],
    },
    { rowId: "fila-2", cells: [{ columnId: "detalle", value: "Botas" }] },
  ],
});

describe("lo que queda por subir", () => {
  it("encuentra los archivos y las firmas, sueltos y dentro de las celdas", () => {
    const names = collectPendingFiles(delivery()).map((item) => item.name);
    expect(names).toEqual([
      "casco.jpg",
      "firma-Juan Pérez.png",
      "firma-Ana Ruiz.png",
      "entrega.png",
    ]);
  });

  it("sin pendientes no hay nada que subir", () => {
    expect(hasPendingFiles({ placa: "SLP-835", filas: [] })).toBe(false);
    expect(
      hasPendingFiles({ foto: { storageId: "s1", name: "ya-subida.png" } }),
    ).toBe(false);
  });
});

describe("subir lo pendiente", () => {
  it("cambia cada archivo por su storageId y conserva el nombre", async () => {
    const storage = fakeStorage();
    const sent = await uploadPendingFiles(delivery(), storage.generateUrl, {
      fetch: storage.send,
    });
    expect(sent.foto).toEqual({
      storageId: "almacen-casco.jpg",
      name: "casco.jpg",
    });
  });

  it("una firma conserva quién firma y su documento", async () => {
    const storage = fakeStorage();
    const sent = await uploadPendingFiles(delivery(), storage.generateUrl, {
      fetch: storage.send,
    });
    expect(sent.firma).toEqual({
      storageId: "almacen-firma-Juan Pérez.png",
      name: "firma-Juan Pérez.png",
      signerName: "Juan Pérez",
    });
    const rows = sent.elementos as ReturnType<typeof delivery>["elementos"];
    expect(rows[0].cells[1].value).toEqual({
      storageId: "almacen-firma-Ana Ruiz.png",
      name: "firma-Ana Ruiz.png",
      signerName: "Ana Ruiz",
      signerDocument: "1020",
    });
  });

  it("sube también lo que está dentro de las celdas de una tabla", async () => {
    const storage = fakeStorage();
    const sent = await uploadPendingFiles(delivery(), storage.generateUrl, {
      fetch: storage.send,
    });
    const rows = sent.elementos as ReturnType<typeof delivery>["elementos"];
    expect(rows[0].cells[2].value).toEqual({
      storageId: "almacen-entrega.png",
      name: "entrega.png",
    });
    // Lo que no es un archivo sigue como estaba.
    expect(rows[0].cells[0]).toEqual({ columnId: "detalle", value: "Casco" });
    expect(rows[1]).toEqual(delivery().elementos[1]);
    expect(storage.requests).toHaveLength(4);
  });

  it("cada subida va a su propia dirección y con su tipo", async () => {
    const storage = fakeStorage();
    await uploadPendingFiles(delivery(), storage.generateUrl, {
      fetch: storage.send,
    });
    expect(new Set(storage.requests.map((item) => item.url)).size).toBe(4);
    expect(
      storage.requests.find((item) => item.name === "casco.jpg")?.type,
    ).toBe("image/jpeg");
  });

  it("no muta los valores que recibe", async () => {
    const storage = fakeStorage();
    const values = delivery();
    await uploadPendingFiles(values, storage.generateUrl, {
      fetch: storage.send,
    });
    expect(collectPendingFiles(values)).toHaveLength(4);
  });

  it("sin pendientes no pide ninguna dirección", async () => {
    const storage = fakeStorage();
    const values = { placa: "SLP-835" };
    expect(
      await uploadPendingFiles(values, storage.generateUrl, {
        fetch: storage.send,
      }),
    ).toEqual(values);
    expect(storage.requests).toHaveLength(0);
  });

  it("lanza si una subida falla, nombrando el archivo", async () => {
    const storage = fakeStorage("entrega.png");
    await expect(
      uploadPendingFiles(delivery(), storage.generateUrl, {
        fetch: storage.send,
      }),
    ).rejects.toThrow("entrega.png");
  });

  it("lanza si el servidor no da dirección de subida", async () => {
    const storage = fakeStorage();
    await expect(
      uploadPendingFiles(delivery(), async () => null, { fetch: storage.send }),
    ).rejects.toThrow("No se pudo preparar la subida");
    expect(storage.requests).toHaveLength(0);
  });

  it("el reintento no vuelve a subir lo que ya subió", async () => {
    const cache: UploadCache = new Map();
    const values = delivery();

    const failing = fakeStorage("entrega.png");
    await expect(
      uploadPendingFiles(values, failing.generateUrl, {
        fetch: failing.send,
        cache,
      }),
    ).rejects.toThrow();
    expect(cache.size).toBe(3);

    const working = fakeStorage();
    const sent = await uploadPendingFiles(values, working.generateUrl, {
      fetch: working.send,
      cache,
    });
    expect(working.requests.map((item) => item.name)).toEqual(["entrega.png"]);
    expect(sent.foto).toEqual({
      storageId: "almacen-casco.jpg",
      name: "casco.jpg",
    });
  });

  it("un mismo archivo en dos campos se sube una vez", async () => {
    const storage = fakeStorage();
    const shared = pendingFile("plano.pdf", "application/pdf");
    const sent = await uploadPendingFiles(
      { plano: shared, copia: { ...shared } },
      storage.generateUrl,
      { fetch: storage.send },
    );
    expect(storage.requests).toHaveLength(1);
    expect(sent.copia).toEqual(sent.plano);
  });
});

describe("validar antes de subir", () => {
  it("cada pendiente toma la forma de lo que se guardará", () => {
    const values = withUploadPlaceholders(delivery());
    expect(values.foto).toEqual({
      storageId: PENDING_STORAGE_ID,
      name: "casco.jpg",
    });
    expect(values.firma).toMatchObject({
      storageId: PENDING_STORAGE_ID,
      signerName: "Juan Pérez",
    });
    expect(hasPendingFiles(values)).toBe(false);
  });
});
