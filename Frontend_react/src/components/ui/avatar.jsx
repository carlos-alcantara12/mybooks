import { forwardRef } from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export const Avatar = forwardRef(function Avatar({ className, ...props }, ref) {
  return <AvatarPrimitive.Root ref={ref} data-slot="avatar" className={joinClasses("ui-avatar", className)} {...props} />;
});

export const AvatarImage = forwardRef(function AvatarImage({ className, ...props }, ref) {
  return <AvatarPrimitive.Image ref={ref} data-slot="avatar-image" className={joinClasses("ui-avatar__image", className)} {...props} />;
});

export const AvatarFallback = forwardRef(function AvatarFallback({ className, ...props }, ref) {
  return <AvatarPrimitive.Fallback ref={ref} data-slot="avatar-fallback" className={joinClasses("ui-avatar__fallback", className)} {...props} />;
});
