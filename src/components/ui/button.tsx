import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:transform hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg hover:from-primary-700 hover:to-primary-800 hover:shadow-xl",
        destructive:
          "bg-red-600 text-white shadow-lg hover:bg-red-700 hover:shadow-xl",
        outline:
          "border-2 border-primary-600 bg-transparent text-primary-700 shadow-sm hover:bg-primary-600 hover:text-white",
        secondary:
          "bg-gray-100 text-gray-700 shadow-sm hover:bg-gray-200",
        ghost: "text-gray-700 hover:bg-gray-100",
        link: "text-primary-600 underline-offset-4 hover:underline",
        success:
          "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg hover:from-green-700 hover:to-green-800 hover:shadow-xl",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
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