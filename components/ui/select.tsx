"use client"

import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, Plus, X } from "lucide-react"
import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  alignRight = false,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & { alignRight?: boolean }) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText className={alignRight ? "flex-1 block w-full text-right" : undefined}>
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

interface MultiSelectProps {
  options: { value: string; label: string }[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  className?: string
  size?: "sm" | "default"
  disabled?: boolean
  enableSelectAll?: boolean
  selectAllText?: string
  clearAllText?: string
}

function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar...",
  className,
  size = "default",
  disabled = false,
  enableSelectAll = true,
  selectAllText = "Seleccionar todo",
  clearAllText = "Quitar todo",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = React.useState<'bottom' | 'top'>('bottom')
  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null)

  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onValueChange(newValue)
  }

  const optionValues = React.useMemo(() => options.map((o) => o.value), [options])
  const isAllSelected = optionValues.length > 0 && optionValues.every((v) => value.includes(v))

  const handleSelectAll = () => {
    onValueChange(optionValues)
  }

  const handleClearAll = () => {
    onValueChange([])
  }

  const selectedOptions = options.filter((option) => value.includes(option.value))

  // Calcular la mejor posición para el dropdown
  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setTriggerRect(rect)

      const viewportHeight = window.innerHeight
      const dropdownHeight = 250 // Altura aproximada del dropdown (max-h-[200px] + padding + botones)

      // Si no hay suficiente espacio abajo, mostrar arriba
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top')
      } else {
        setDropdownPosition('bottom')
      }
    }
  }, [open])

  // Manejar el scroll para reposicionar el dropdown
  React.useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setTriggerRect(rect)
      }
    }

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  return (
    <div className="relative h-full w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8" : "h-9",
          className
        )}
      >
        <div className="flex flex-1 items-center gap-2 min-w-0 justify-start">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : selectedOptions.length === 1 ? (
            <span className="truncate text-left">{selectedOptions[0].label}</span>
          ) : (
            <>
              <span className="truncate flex-1 text-left">{selectedOptions[0].label}</span>
              <span className="text-muted-foreground whitespace-nowrap flex-shrink-0">
                +{selectedOptions.length - 1} más
              </span>
            </>
          )}
        </div>
        <ChevronDownIcon className={cn("size-4 opacity-50 transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            onWheel={(e) => {
              // Permitir que el scroll se propague si está dentro del dropdown
              const target = e.target as Element
              const dropdown = document.querySelector('[data-dropdown="multiselect"]')
              if (dropdown && dropdown.contains(target)) {
                e.stopPropagation()
              }
            }}
          />
          {triggerRect && typeof window !== 'undefined' &&
            createPortal(
              <div
                data-dropdown="multiselect"
                className="fixed z-[9999] rounded-md border bg-popover shadow-md pointer-events-auto"
                style={{
                  left: triggerRect?.left ?? 0,
                  width: triggerRect?.width ?? 200,
                  top: dropdownPosition === 'bottom'
                    ? (triggerRect?.bottom ?? 0) + 4
                    : (triggerRect?.top ?? 0) - 4,
                  transform: dropdownPosition === 'top' ? 'translateY(-100%)' : 'none',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="max-h-[200px] overflow-y-auto p-1 space-y-1"
                  onWheel={(e) => {
                    // Permitir scroll natural dentro del contenedor
                    e.stopPropagation()
                  }}
                >
                  {options.map((option) => (
                    <div
                      key={option.value}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleSelect(option.value)
                      }}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        value.includes(option.value) && "bg-accent text-accent-foreground"
                      )}
                    >
                      <div className="flex size-4 items-center justify-center">
                        {value.includes(option.value) && (
                          <CheckIcon className="size-4" />
                        )}
                      </div>
                      <span className="truncate">{option.label}</span>
                    </div>
                  ))}
                </div>
                {enableSelectAll && (
                  <div className="flex items-center justify-end gap-1.5 p-1.5 border-t">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent hover:text-accent-foreground transition-colors",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        isAllSelected ? handleClearAll() : handleSelectAll()
                      }}
                      disabled={optionValues.length === 0}
                      title={isAllSelected ? clearAllText : selectAllText}
                    >
                      {isAllSelected ? (
                        <X className="size-3.5" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      <span>{isAllSelected ? clearAllText : selectAllText}</span>
                    </button>
                  </div>
                )}
              </div>,
              document.body
            )
          }
        </>
      )}
    </div>
  )
}

function MultiSelectTags({
  options,
  value,
  onValueChange,
  className,
}: Pick<MultiSelectProps, "options" | "value" | "onValueChange" | "className">) {
  const selectedOptions = options.filter((option) => value.includes(option.value))

  const handleRemove = (optionValue: string) => {
    onValueChange(value.filter((v) => v !== optionValue))
  }

  if (selectedOptions.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {selectedOptions.map((option) => (
        <div
          key={option.value}
          className="inline-flex items-center gap- rounded-md bg-secondary px-2 py-1 text-xs"
        >
          <span>{option.label}</span>
          <button
            type="button"
            onClick={() => handleRemove(option.value)}
            className="hover:bg-secondary-foreground/20 rounded-full p-0.5"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

export {
  MultiSelect,
  MultiSelectTags, Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue
}

