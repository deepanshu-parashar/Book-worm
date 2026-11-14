import { useI18n } from '../lib/i18n.tsx';
import { Page } from './parts.tsx';

// Placeholder until M3 (taste profile onboarding).
export default function Profile() {
  const { t } = useI18n();
  return <Page title={t('profile.title')}><p className="notice">{t('profile.intro')}</p></Page>;
}
