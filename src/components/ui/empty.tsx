
import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function Empty({
  icon,
  title,
  description,
  action,
  className,
}: EmptyProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-8", className)}>
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
