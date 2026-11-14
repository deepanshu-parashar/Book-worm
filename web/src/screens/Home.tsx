import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { emptyProfile } from '../../../shared/types.ts';
import { ApiFailed, health, scanBook, scanShelf } from '../lib/api.ts';
import { useI18n, type MsgKey } from '../lib/i18n.tsx';
import { prepareImage } from '../lib/image.ts';
import { useAppState } from '../lib/state.tsx';
import { recentFeedback } from '../lib/storage.ts';

type Mode = 'shelf' | 'book';

export default function Home() {
  const { t, lang, setLang } = useI18n();
  const { profile, finds, setResults } = useAppState();
  const nav = useNavigate();
  const shelfInput = useRef<HTMLInputElement>(null);
  const bookInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Mode | null>(null);
  const [error, setError] = useState<MsgKey | null>(null);
  const [mock, setMock] = useState(false);

  useEffect(() => { health().then((h) => setMock(Boolean(h?.mock))); }, []);

  async function onPhoto(mode: Mode, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same photo again
    if (!file) return;
    setError(null);
    setBusy(mode);
    try {
      let prepared;
      try {
        prepared = await prepareImage(file);
      } catch {
        setError('error.image');
        return;
      }
      const req = { ...prepared, lang, profile: profile ?? emptyProfile, feedback: recentFeedback(finds) };
      if (mode === 'shelf') {
        const { results } = await scanShelf(req);
        if (results.length === 0) { setError('error.noMatch'); return; }
        setResults(results);
        nav('/shelf');
      } else {
        const { result } = await scanBook(req);
        if (!result) { setError('error.noMatch'); return; }
        setResults([result]);
        nav(`/book/${encodeURIComponent(result.book.id)}`);
      }
    } catch (err) {
      setError(err instanceof ApiFailed && err.kind === 'network' ? 'error.network' : 'error.server');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="page home">
      <header className="top">
        <h1>{t('app.title')}</h1>
        <div className="lang" role="group" aria-label="Language">
          {(['de', 'en'] as const).map((l) => (
            <button key={l} className={l === lang ? 'on' : ''} aria-pressed={l === lang} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      <p className="tagline">{t('home.tagline')}</p>

      {!profile && (
        <Link className="notice" to="/profile">
          {t('profile.missing')} <strong>{t('profile.setup')} ›</strong>
        </Link>
      )}

      <input ref={shelfInput} type="file" accept="image/*" capture="environment" hidden
        data-testid="shelf-input" onChange={(e) => onPhoto('shelf', e)} />
      <input ref={bookInput} type="file" accept="image/*" capture="environment" hidden
        data-testid="book-input" onChange={(e) => onPhoto('book', e)} />

      <button className="primary big" disabled={busy !== null} onClick={() => shelfInput.current?.click()}>
        <span>{busy === 'shelf' ? t('busy.shelf') : t('home.scanShelf')}</span>
        <small>{t('home.scanShelfHint')}</small>
      </button>
      <button className="secondary big" disabled={busy !== null} onClick={() => bookInput.current?.click()}>
        <span>{busy === 'book' ? t('busy.book') : t('home.scanBook')}</span>
        <small>{t('home.scanBookHint')}</small>
      </button>

      {busy && <div className="progress" role="status" aria-live="polite"><i /></div>}
      {error && <p className="error" role="alert">{t(error)}</p>}

      <nav className="links">
        <Link className="card" to="/finds">{t('home.finds')} <span className="muted">{finds.length}</span></Link>
        <Link className="card" to="/profile">{t('home.profile')}</Link>
      </nav>

      <footer className="muted small">
        {mock && <p>{t('home.mock')}</p>}
        <p>{t('home.privacy')}</p>
      </footer>
    </main>
  );
}
