import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/cn';

export interface AuthFormCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthFormCard({
  title,
  description,
  children,
  footer,
  className,
}: AuthFormCardProps) {
  return (
    <Card className={cn('w-full shadow-md', className)}>
      <CardHeader className="space-y-1">
        <CardTitle
          role="heading"
          aria-level={2}
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-muted-foreground text-sm">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && (
        <CardFooter className="text-muted-foreground flex flex-wrap items-center justify-center gap-1 border-t px-6 py-4 text-center text-sm">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
