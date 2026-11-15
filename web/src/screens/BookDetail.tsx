import { useParams } from 'react-router-dom';
import { useI18n } from '../lib/i18n.tsx';
import { useAppState } from '../lib/state.tsx';
import { ConfidenceBadge, Page, ScoreBadge } from './parts.tsx';

export default function BookDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const { results, finds, recordDecision } = useAppState();
  const find = finds.find((f) => f.book.id === id);
  const item = results.find((r) => r.book.id === id) ?? find;

  if (!item) return <Page title={t('app.title')}><p className="notice">{t('book.notFound')}</p></Page>;
  const { book, score } = item;
  const unknown = book.confidence === 'unknown';
  const facts = [
    book.genre,
    book.year,
    book.pages ? t('book.pages', { n: book.pages }) : null,
    book.language?.toUpperCase(),
    book.difficulty ? t(`difficulty.${book.difficulty}`) : null,
  ].filter(Boolean);

  return (
    <Page title={book.title || t('book.unknownTitle')}>
      <section className="detail">
        <div className="headline">
          {book.coverUrl && (
            <img className="cover" src={book.coverUrl} alt="" referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.hidden = true; }} />
          )}
          <div>
            {book.author && <p className="author">{book.author}</p>}
            <ConfidenceBadge confidence={book.confidence} />
          </div>
        </div>

        <div className="card verdict">
          <ScoreBadge item={item} large />
          <div>
            <span className="muted small">{t('book.takeIt')}</span>
            <p>{score.reason}</p>
          </div>
        </div>

        {facts.length > 0 && <ul className="facts">{facts.map((f) => <li key={String(f)}>{f}</li>)}</ul>}

        {unknown ? (
          <p className="notice">{t('book.unknownHint')}</p>
        ) : (
          <>
            {book.summary && <p className="summary">{book.summary}</p>}
            {book.confidence === 'uncertain' && (
              <p className="muted small">{t(book.summary ? 'book.uncertainHint' : 'book.noSummaryHint')}</p>
            )}
          </>
        )}

        <div className="actions">
          <button className={find?.decision === 'took' ? 'primary' : 'secondary'} aria-pressed={find?.decision === 'took'}
            onClick={() => recordDecision(item, 'took')}>{t('book.took')}</button>
          <button className={find?.decision === 'skipped' ? 'primary' : 'secondary'} aria-pressed={find?.decision === 'skipped'}
            onClick={() => recordDecision(item, 'skipped')}>{t('book.skipped')}</button>
        </div>
        {find && <p className="muted small" role="status">{t('book.saved')}</p>}
      </section>
    </Page>
  );
}
