import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from '@/lib/i18n';
import { useAuth, getInitials } from '@/features/auth';
import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/limits';
import {
  updateDisplayNameSchema,
  type UpdateDisplayNameInput,
} from '../schemas';
import { useProfileSettings } from '../hooks/useProfileSettings';

export interface ProfileSectionProps {
  /** Optional override for testing or storybooks */
  onSave?: (displayName: string) => Promise<void>;
  isSavingOverride?: boolean;
}

export function ProfileSection({
  onSave,
  isSavingOverride,
}: ProfileSectionProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { updateDisplayName, isSaving: hookIsSaving } = useProfileSettings();

  const isSaving = isSavingOverride ?? hookIsSaving;
  const currentDisplayName = profile?.displayName ?? user?.displayName ?? '';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateDisplayNameInput>({
    resolver: zodResolver(updateDisplayNameSchema),
    defaultValues: {
      displayName: currentDisplayName,
    },
  });

  useEffect(() => {
    reset({ displayName: currentDisplayName });
  }, [currentDisplayName, reset]);

  if (!user) {
    return null;
  }

  const effectiveDisplayName = profile?.displayName || user.displayName;
  const initials = getInitials(effectiveDisplayName, user.email);
  const emailDisplay =
    user.email ?? t('auth.demoBadge', { defaultValue: 'Demo User' });

  const onSubmit = async (values: UpdateDisplayNameInput) => {
    const targetName = values.displayName.trim();
    if (onSave) {
      await onSave(targetName);
    } else {
      await updateDisplayName(targetName);
    }
    reset({ displayName: targetName });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('settings.profile.title', { defaultValue: 'Profile' })}
        </CardTitle>
        <CardDescription>
          {t('settings.profile.description', {
            defaultValue: 'Personal details and account information',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar size="lg" className="size-16 text-lg">
            {user.photoURL && (
              <AvatarImage
                src={user.photoURL}
                alt={effectiveDisplayName || emailDisplay}
              />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground text-sm font-medium">
                {emailDisplay}
              </span>
              {user.isAnonymous ? (
                <span
                  data-slot="demo-badge"
                  className="bg-muted text-muted-foreground inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold select-none"
                >
                  {t('auth.demoBadge', { defaultValue: 'Demo' })}
                </span>
              ) : user.emailVerified ? (
                <span
                  data-slot="verified-badge"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 select-none dark:text-emerald-400"
                >
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  {t('settings.profile.verifiedBadge', {
                    defaultValue: 'Verified',
                  })}
                </span>
              ) : (
                <span
                  data-slot="unverified-badge"
                  className="bg-warning/10 text-warning inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium select-none"
                >
                  <AlertCircle className="size-3" aria-hidden="true" />
                  {t('settings.profile.unverifiedBadge', {
                    defaultValue: 'Unverified',
                  })}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {t('settings.profile.emailLabel', {
                defaultValue: 'Account Email',
              })}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="settings-display-name">
              {t('settings.profile.displayNameLabel', {
                defaultValue: 'Display Name',
              })}
            </Label>
            <Input
              id="settings-display-name"
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              placeholder={t('settings.profile.displayNamePlaceholder', {
                defaultValue: 'Enter your name',
              })}
              disabled={isSaving}
              {...register('displayName')}
            />
            {errors.displayName && (
              <p role="alert" className="text-destructive text-xs font-medium">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving || !isDirty}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('settings.profile.saving', {
                    defaultValue: 'Saving...',
                  })}
                </>
              ) : (
                t('settings.profile.saveButton', {
                  defaultValue: 'Save Changes',
                })
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
