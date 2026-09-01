import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold font-sans tracking-tight leading-none text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary/90 text-primary-foreground shadow-glow hover:bg-primary border border-white/10",
        destructive:
          "bg-destructive/90 text-destructive-foreground hover:bg-destructive border border-white/10 shadow-[0_0_24px_-2px_hsl(0_72%_55%/0.5)]",
        outline:
          "border border-white/15 bg-white/[0.04] backdrop-blur-xl hover:bg-white/[0.09] text-foreground",
        secondary:
          "bg-secondary/80 text-secondary-foreground hover:bg-secondary border border-white/10",
        ghost: "hover:bg-white/[0.07] text-foreground",
        glass: "glass text-foreground hover:bg-white/[0.09] hover:shadow-glow",
      },
      size: {
        default: "h-11 px-5 py-2 [&_svg]:size-[1.1rem]",
        sm: "h-9 rounded-lg px-3 text-xs [&_svg]:size-4",
        lg: "h-14 rounded-2xl px-7 text-base [&_svg]:size-5",
        icon: "h-11 w-11 [&_svg]:size-[1.15rem]",
        "icon-lg": "h-16 w-16 rounded-2xl [&_svg]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
