import * as React from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';

interface ResponsiveDialogContextValue {
  isDesktop: boolean;
}

const ResponsiveDialogContext =
  React.createContext<ResponsiveDialogContextValue>({
    isDesktop: true,
  });

function useResponsiveDialog() {
  return React.useContext(ResponsiveDialogContext);
}

export interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  /** Explicit breakpoint override, defaults to query `(min-width: 768px)` */
  isDesktop?: boolean;
  /** Optional convenience props for simple usage */
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  defaultOpen,
  children,
  isDesktop: propIsDesktop,
  trigger,
  title,
  description,
  footer,
  contentClassName,
}: ResponsiveDialogProps) {
  const matchesDesktop = useMediaQuery('(min-width: 768px)');
  const isDesktop = propIsDesktop ?? matchesDesktop;

  const contextValue = React.useMemo(() => ({ isDesktop }), [isDesktop]);

  // Convenience mode: if `title` is supplied directly, assemble the structure automatically
  const isConvenienceMode = title !== undefined;

  const content = isConvenienceMode ? (
    <>
      {trigger && (
        <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      )}
      <ResponsiveDialogContent className={contentClassName}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          {description && (
            <ResponsiveDialogDescription>
              {description}
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>
        {children}
        {footer && <ResponsiveDialogFooter>{footer}</ResponsiveDialogFooter>}
      </ResponsiveDialogContent>
    </>
  ) : (
    children
  );

  return (
    <ResponsiveDialogContext.Provider value={contextValue}>
      {isDesktop ? (
        <Dialog
          open={open}
          onOpenChange={onOpenChange}
          defaultOpen={defaultOpen}
        >
          {content}
        </Dialog>
      ) : (
        <Drawer
          open={open}
          onOpenChange={onOpenChange}
          defaultOpen={defaultOpen}
        >
          {content}
        </Drawer>
      )}
    </ResponsiveDialogContext.Provider>
  );
}

export function ResponsiveDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogTrigger {...props} />;
  }
  return <DrawerTrigger {...props} />;
}

export function ResponsiveDialogClose({
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogClose {...props} />;
  }
  return <DrawerClose {...props} />;
}

export function ResponsiveDialogContent({
  className,
  children,
  showCloseButton,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const { isDesktop } = useResponsiveDialog();

  if (isDesktop) {
    return (
      <DialogContent
        className={className}
        showCloseButton={showCloseButton}
        {...props}
      >
        {children}
      </DialogContent>
    );
  }

  return (
    <DrawerContent
      className={cn('pb-[env(safe-area-inset-bottom,1rem)]', className)}
      {...props}
    >
      {children}
    </DrawerContent>
  );
}

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogHeader className={className} {...props} />;
  }
  return <DrawerHeader className={className} {...props} />;
}

export function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogFooter className={className} {...props} />;
  }
  return <DrawerFooter className={className} {...props} />;
}

export function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogTitle className={className} {...props} />;
  }
  return <DrawerTitle className={className} {...props} />;
}

export function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogDescription className={className} {...props} />;
  }
  return <DrawerDescription className={className} {...props} />;
}
