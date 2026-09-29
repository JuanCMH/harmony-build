"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // Las pestañas no encogen por debajo de su texto (`min-w-fit` en
        // `TabsTrigger`): cuando no caben, la fila se desplaza en vez de salirse
        // de la pantalla (`02 §7`). Los 3px de padding dejan sitio al anillo de
        // foco, que un contenedor que se desplaza recortaría.
        "bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full items-center justify-start overflow-x-auto rounded-lg p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  // Si la fila no cabe se desplaza (`TabsList`), y la pestaña activa al abrir
  // puede quedar cortada en el borde. Se mueve sólo la lista, no el sheet ni
  // la página que la contienen, como haría `scrollIntoView`.
  React.useLayoutEffect(() => {
    const tab = ref.current
    const list = tab?.parentElement
    if (!tab || !list || tab.dataset.state !== "active") return
    if (list.scrollWidth <= list.clientWidth) return
    const overflow =
      tab.getBoundingClientRect().right - list.getBoundingClientRect().right
    if (overflow > 0) list.scrollLeft += overflow + 3
  }, [])

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] min-w-fit flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function UnderlineTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // `min-w-0` y scroll horizontal: sin ellos la fila crecía hasta 819px
        // sobre un viewport de 390 y las últimas pestañas quedaban fuera de la
        // pantalla, sin envolver ni desplazarse. Sin app nativa, el teléfono es
        // esta misma web (`02 §7`).
        "text-muted-foreground inline-flex h-9 w-fit min-w-0 max-w-full items-center gap-1 overflow-x-auto border-b border-border/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  )
}

function UnderlineTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-1.5 px-3 pb-2.5 pt-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors",
        "hover:text-foreground/80",
        "data-[state=active]:text-foreground",
        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:transition-all",
        "data-[state=active]:after:bg-foreground",
        "after:bg-transparent",
        // El anillo va **por dentro** (`ring-inset`): la barra de pestañas se
        // desplaza en horizontal cuando no caben, y un contenedor que se
        // desplaza recorta lo que sobresale, así que un anillo exterior salía
        // cortado por arriba y por los lados. Aquí no cabe darle aire con
        // padding: el subrayado de la pestaña activa se apoya en el borde
        // inferior de la barra y separarlos desalinearía las dos líneas
        // (`03 §7`, «no elimines el anillo de foco»).
        "focus-visible:outline-ring focus-visible:inset-ring-ring/50 focus-visible:inset-ring-[3px] focus-visible:outline-1 focus-visible:-outline-offset-1",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, UnderlineTabsList, UnderlineTabsTrigger, TabsContent }
