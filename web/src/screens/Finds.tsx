import { Link } from 'react-router-dom';
import type { Verdict } from '../../../shared/types.ts';
import { useI18n } from '../lib/i18n.tsx';
import { useAppState } from '../lib/state.tsx';
import { Page, ScoreBadge } from './parts.tsx';

const VERDICTS: Verdict[] = ['liked', 'disliked', 'unread'];

export default function Finds() {
  const { t, lang } = useI18n();
  const { finds, setVerdict, removeFind, clearFinds } = useAppState();
  const fmt = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' });

  return (
    <Page title={t('finds.title')}>
      {finds.length === 0 && <p className="notice">{t('finds.empty')}</p>}
      {finds.map((f) => (
        <article className="card find" key={f.book.id}>
          <Link className="book" to={`/book/${encodeURIComponent(f.book.id)}`}>
            <ScoreBadge item={f} />
            <span className="body">
              <strong>{f.book.title || t('book.unknownTitle')}</strong>
              {f.book.author && <span className="muted">{f.book.author}</span>}
              <span className="muted small">{t(`finds.${f.decision}`)} · {fmt.format(new Date(f.date))}</span>
            </span>
          </Link>
          <div className="row">
            {f.decision === 'took' && VERDICTS.map((v) => (
              <button key={v} className={`chip ${f.verdict === v ? 'on' : ''}`} aria-pressed={f.verdict === v}
                onClick={() => setVerdict(f.book.id, v)}>{t(`finds.${v}`)}</button>
            ))}
            <button className="link danger" onClick={() => removeFind(f.book.id)}>{t('finds.delete')}</button>
          </div>
        </article>
      ))}
      {finds.length > 0 && (
        <button className="link danger" onClick={() => { if (confirm(t('finds.clearConfirm'))) clearFinds(); }}>
          {t('finds.clear')}
        </button>
      )}
    </Page>
  );
}
