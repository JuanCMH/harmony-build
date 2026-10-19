"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const ref = React.useRef<HTMLDivElement>(null)

  // Una tabla más ancha que su caja se desplaza de lado, y sin una señal nadie
  // lo sabe: las columnas de la derecha parecen no existir. El borde por donde
  // queda contenido se difumina. Los atributos se escriben a mano para no
  // repintar la tabla en cada evento de desplazamiento.
  React.useEffect(() => {
    const container = ref.current
    if (!container) return
    const update = () => {
      const max = container.scrollWidth - container.clientWidth
      container.toggleAttribute("data-more-start", container.scrollLeft > 1)
      container.toggleAttribute(
        "data-more-end",
        container.scrollLeft < max - 1
      )
    }
    update()
    container.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(container)
    if (container.firstElementChild) {
      observer.observe(container.firstElementChild)
    }
    return () => {
      container.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      data-slot="table-container"
      className="relative w-full overflow-x-auto data-more-end:mask-r-from-[calc(100%-3rem)] data-more-start:mask-l-from-[calc(100%-3rem)]"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
