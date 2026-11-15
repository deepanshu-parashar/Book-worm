import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Confidence, ScoredBook } from '../../../shared/types.ts';
import { useI18n } from '../lib/i18n.tsx';

export function Page({ title, children, back = true }: { title: string; children: ReactNode; back?: boolean }) {
  const { t } = useI18n();
  const nav = useNavigate();
  return (
    <main className="page">
      <header className="bar">
        {back && (
          <button className="link" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))}>
            ‹ {t('nav.back')}
          </button>
        )}
        <h1>{title}</h1>
      </header>
      {children}
    </main>
  );
}

export function scoreTone(value: number): 'good' | 'mid' | 'low' {
  return value >= 70 ? 'good' : value >= 40 ? 'mid' : 'low';
}

export function ScoreBadge({ item, large }: { item: ScoredBook; large?: boolean }) {
  const unknown = item.book.confidence === 'unknown' || item.score.cappedBy === 'unknown';
  return (
    <span className={`score ${unknown ? 'none' : scoreTone(item.score.value)} ${large ? 'large' : ''}`}>
      {unknown ? '?' : Math.round(item.score.value)}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const { t } = useI18n();
  return <span className={`conf ${confidence}`}>{t(`confidence.${confidence}`)}</span>;
}

export function BookCard({ item }: { item: ScoredBook }) {
  const { t } = useI18n();
  const { book, score } = item;
  return (
    <Link className="card book" to={`/book/${encodeURIComponent(book.id)}`}>
      <ScoreBadge item={item} />
      <span className="body">
        <strong>{book.title || t('book.unknownTitle')}</strong>
        {book.author && <span className="muted">{book.author}</span>}
        <span className="reason">{score.reason}</span>
        {book.confidence !== 'known' && <ConfidenceBadge confidence={book.confidence} />}
      </span>
    </Link>
  );
}
