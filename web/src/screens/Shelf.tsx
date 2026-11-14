import { Navigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n.tsx';
import { useAppState } from '../lib/state.tsx';
import { BookCard, Page } from './parts.tsx';
import { splitShelf } from '../lib/rank.ts';

export default function Shelf() {
  const { t } = useI18n();
  const { results } = useAppState();
  if (results.length === 0) return <Navigate to="/" replace />;
  const { top, rest } = splitShelf(results);

  return (
    <Page title={t('shelf.title')}>
      {top.length > 0 ? (
        <section>
          <h2>{t('shelf.top')}</h2>
          {top.map((r) => <BookCard key={r.book.id} item={r} />)}
        </section>
      ) : (
        <p className="notice">{t('shelf.none')}</p>
      )}
      {rest.length > 0 && (
        <details open={top.length === 0}>
          <summary>{t('shelf.rest', { n: rest.length })}</summary>
          {rest.map((r) => <BookCard key={r.book.id} item={r} />)}
        </details>
      )}
    </Page>
  );
}
