import { ChevronsUpDown, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/lib/i18n';
import { getInitials } from '../getInitials';
import { useAuth } from '../useAuth';
import { useSignOut } from '../useSignOut';

export interface UserMenuProps {
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * User account dropdown menu displaying avatar with initials, user info,
 * link to settings, and sign-out action.
 * Can be rendered in desktop sidebar footer (default) or mobile header (compact).
 */
export function UserMenu({ variant = 'default', className }: UserMenuProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { signOut, isSigningOut } = useSignOut();

  if (auth.status !== 'authenticated') {
    return null;
  }

  const { user, profile } = auth;
  const effectiveDisplayName = profile?.displayName || user.displayName;
  const initials = getInitials(effectiveDisplayName, user.email);
  const displayName =
    effectiveDisplayName || user.email || t('auth.userMenu.account');
  const secondaryText = effectiveDisplayName && user.email ? user.email : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'compact' ? (
          <button
            type="button"
            aria-label={t('auth.userMenu.account')}
            className={cn(
              'focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-full transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:outline-hidden',
              className,
            )}
          >
            <Avatar size="sm">
              {user.photoURL && (
                <AvatarImage src={user.photoURL} alt={displayName} />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <button
            type="button"
            aria-label={t('auth.userMenu.account')}
            className={cn(
              'hover:bg-sidebar-accent/50 focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
              className,
            )}
          >
            <Avatar size="default">
              {user.photoURL && (
                <AvatarImage src={user.photoURL} alt={displayName} />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col text-xs leading-normal">
              <span className="text-foreground truncate font-medium">
                {displayName}
              </span>
              {secondaryText && (
                <span className="text-muted-foreground truncate">
                  {secondaryText}
                </span>
              )}
            </div>
            <ChevronsUpDown
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden="true"
            />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={variant === 'compact' ? 'end' : 'start'}
        side={variant === 'compact' ? 'bottom' : 'top'}
        sideOffset={6}
        className="w-56"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1 py-0.5">
            <p className="text-foreground truncate text-sm leading-tight font-medium">
              {displayName}
            </p>
            {user.email && (
              <p className="text-muted-foreground truncate text-xs leading-normal">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            to={ROUTES.settings}
            className="flex cursor-pointer items-center"
          >
            <Settings className="mr-2 size-4" aria-hidden="true" />
            <span>{t('auth.userMenu.settings')}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isSigningOut}
          onClick={() => {
            void signOut();
          }}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 size-4" aria-hidden="true" />
          <span>{t('auth.userMenu.signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
