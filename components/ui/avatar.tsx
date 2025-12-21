import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"
import { User } from "lucide-react"

// Extended props to support both Radix composition and Legacy custom usage
export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  // Legacy props
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "away" | "busy";
  badge?: React.ReactNode;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
}

const statusColors = {
  online: "bg-green-500",
  offline: "bg-gray-500",
  away: "bg-yellow-500",
  busy: "bg-red-500",
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, src, alt = "Avatar", size = "md", status, badge, children, ...props }, ref) => {
  // Check if we are in composition mode (children present)
  // Legacy usage typically doesn't pass children (self-closing <Avatar ... />)
  const isComposition = React.Children.count(children) > 0

  if (isComposition) {
    return (
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      >
        {children}
      </AvatarPrimitive.Root>
    )
  }

  // Legacy Mode: Replicate the old structure using Radix primitives internally where possible
  // Structure: Wrapper(relative) -> Avatar(Root) -> Image/Fallback -> Status/Badge
  return (
    <div className={cn("relative inline-block", sizeClasses[size], className)} ref={ref as any}>
      <AvatarPrimitive.Root
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full h-full w-full",
          // Legacy visual styles
          "bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold border-2 border-gray-700"
        )}
        {...props}
      >
        {src ? (
          <AvatarPrimitive.Image
            src={src}
            alt={alt}
            className="aspect-square h-full w-full object-cover"
          />
        ) : null}
        <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center bg-transparent text-white delay-0">
          <User className={cn(size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6")} />
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-gray-900",
            statusColors[status],
            size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
          )}
        />
      )}
      {badge && (
        <div className="absolute -top-1 -right-1 flex items-center justify-center">
          {badge}
        </div>
      )}
    </div>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }







