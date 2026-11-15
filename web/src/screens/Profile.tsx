import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { GENRES, LANGUAGES } from '../../../shared/genres.ts';
import { emptyProfile, type TasteProfile } from '../../../shared/types.ts';
import { useI18n, type MsgKey } from '../lib/i18n.tsx';
import { useAppState } from '../lib/state.tsx';
import { Page } from './parts.tsx';

const PAGE_LIMITS = [200, 300, 400, 600];
const LANGUAGE_NAMES: Record<string, string> = { de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español', it: 'Italiano' };

const toLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Chips({ options, selected, label, onToggle }: {
  options: readonly string[]; selected: string[]; label: (o: string) => string; onToggle: (o: string) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o} className={`chip ${selected.includes(o) ? 'on' : ''}`}
          aria-pressed={selected.includes(o)} onClick={() => onToggle(o)}>{label(o)}</button>
      ))}
    </div>
  );
}

export default function Profile() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { profile, setProfile } = useAppState();
  const firstRun = profile === null;
  const [draft, setDraft] = useState<TasteProfile>(profile ?? emptyProfile);
  // Free text is kept as typed and only split into lines on save.
  const [loved, setLoved] = useState((profile?.lovedBooks ?? []).join('\n'));
  const [disliked, setDisliked] = useState((profile?.dislikedBooks ?? []).join('\n'));
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);

  const patch = (p: Partial<TasteProfile>) => { setSaved(false); setDraft((d) => ({ ...d, ...p })); };
  const genreLabel = (g: string) => t(`genre.${g}` as MsgKey);

  const questions: { key: MsgKey; body: ReactNode }[] = [
    { key: 'profile.genres', body: (
      <Chips options={GENRES} selected={draft.genres} label={genreLabel}
        onToggle={(g) => patch({ genres: toggle(draft.genres, g), excludedGenres: draft.excludedGenres.filter((x) => x !== g) })} />
    ) },
    { key: 'profile.excluded', body: (
      <Chips options={GENRES} selected={draft.excludedGenres} label={genreLabel}
        onToggle={(g) => patch({ excludedGenres: toggle(draft.excludedGenres, g), genres: draft.genres.filter((x) => x !== g) })} />
    ) },
    { key: 'profile.languages', body: (
      <Chips options={LANGUAGES} selected={draft.languages} label={(l) => LANGUAGE_NAMES[l] ?? l}
        onToggle={(l) => patch({ languages: toggle(draft.languages, l) })} />
    ) },
    { key: 'profile.maxPages', body: (
      <select aria-label={t('profile.maxPages')} value={draft.maxPages ?? ''}
        onChange={(e) => patch({ maxPages: e.target.value ? Number(e.target.value) : undefined })}>
        <option value="">{t('profile.maxPages.any')}</option>
        {PAGE_LIMITS.map((n) => <option key={n} value={n}>{t('book.pages', { n })}</option>)}
      </select>
    ) },
    { key: 'profile.loved', body: (
      <textarea aria-label={t('profile.loved')} value={loved} onChange={(e) => { setSaved(false); setLoved(e.target.value); }} />
    ) },
    { key: 'profile.disliked', body: (
      <textarea aria-label={t('profile.disliked')} value={disliked} onChange={(e) => { setSaved(false); setDisliked(e.target.value); }} />
    ) },
    { key: 'profile.notes', body: (
      <textarea aria-label={t('profile.notes')} placeholder={t('profile.notesPlaceholder')} value={draft.notes}
        onChange={(e) => patch({ notes: e.target.value })} />
    ) },
  ];

  function save() {
    setProfile({ ...draft, lovedBooks: toLines(loved), dislikedBooks: toLines(disliked), notes: draft.notes.trim() });
    setSaved(true);
  }

  if (firstRun) {
    const q = questions[step];
    const last = step === questions.length - 1;
    return (
      <Page title={t('profile.title')}>
        {step === 0 && <p className="muted">{t('profile.intro')}</p>}
        <p className="muted small">{t('profile.step', { n: step + 1, total: questions.length })}</p>
        <label className="field">{t(q.key)}</label>
        {q.body}
        <div className="wizard-nav">
          {step > 0 && <button className="secondary" onClick={() => setStep(step - 1)}>{t('profile.back')}</button>}
          <button className="primary" onClick={() => { if (last) { save(); nav('/'); } else setStep(step + 1); }}>
            {last ? t('profile.save') : t('profile.next')}
          </button>
        </div>
        <button className="link" onClick={() => nav('/')}>{t('profile.skip')}</button>
      </Page>
    );
  }

  return (
    <Page title={t('profile.title')}>
      <p className="muted">{t('profile.intro')}</p>
      {questions.map((q) => (
        <div key={q.key}>
          <label className="field">{t(q.key)}</label>
          {q.body}
        </div>
      ))}
      <div className="wizard-nav">
        <button className="primary" onClick={save}>{t('profile.save')}</button>
      </div>
      {saved && <p className="muted small" role="status">{t('profile.saved')}</p>}
    </Page>
  );
}
