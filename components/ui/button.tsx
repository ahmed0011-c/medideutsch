import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "bg-teal text-white shadow-[0_4px_12px_rgba(13,148,136,.3)] hover:bg-[#0b7f75]",
        outline: "border border-[#dbe8ee] bg-white text-navy hover:bg-[#f6fafb]",
        ghost: "bg-transparent text-navy hover:bg-[#e6f7f5]",
        soft: "bg-[#e6f7f5] text-teal hover:bg-[#ccefeb]",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
