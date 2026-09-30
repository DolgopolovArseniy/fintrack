import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { changeAppLanguage, type SupportedLanguage } from '@/i18n/config';

export function LanguageToggle() {
  const { i18n, t } = useTranslation('layout');
  const resolvedLang = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const currentLang: SupportedLanguage = resolvedLang.startsWith('ru')
    ? 'ru'
    : 'en';

  const toggleLanguage = () => {
    const nextLang: SupportedLanguage = currentLang === 'en' ? 'ru' : 'en';
    void changeAppLanguage(nextLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="text-muted-foreground hover:text-foreground h-8 gap-1.5 px-2 text-xs font-medium"
      aria-label={t('language.toggle')}
      title={t('language.toggle')}
    >
      <Globe className="size-3.5" />
      <span className="uppercase">{currentLang}</span>
    </Button>
  );
}
