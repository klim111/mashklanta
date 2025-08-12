import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:transform hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-financial-gradient text-white shadow-lg hover:shadow-xl border-0",
        destructive:
          "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:shadow-xl",
        outline:
          "border-2 border-financial-primary bg-white text-financial-primary shadow-md hover:bg-financial-primary hover:text-white hover:shadow-lg",
        secondary:
          "bg-financial-gray-100 text-financial-gray-800 shadow-md hover:bg-financial-gray-200 hover:shadow-lg",
        ghost: "hover:bg-financial-gray-100 hover:text-financial-gray-900 text-financial-gray-700",
        link: "text-financial-primary underline-offset-4 hover:underline hover:text-financial-primary-dark",
        success: "bg-financial-success-gradient text-white shadow-lg hover:shadow-xl",
        warning: "bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg hover:shadow-xl",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props} />
    );
  }
)
Button.displayName = "Button"

export { Button, buttonVariants } 