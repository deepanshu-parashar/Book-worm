import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Decision, Find, ScoredBook, TasteProfile, Verdict } from '../../../shared/types.ts';
import { loadFinds, loadProfile, saveFinds, saveProfile } from './storage.ts';

interface AppState {
  profile: TasteProfile | null;
  setProfile: (p: TasteProfile) => void;
  /** Results of the latest scan, kept in memory only. */
  results: ScoredBook[];
  setResults: (r: ScoredBook[]) => void;
  finds: Find[];
  recordDecision: (item: ScoredBook, decision: Decision) => void;
  setVerdict: (bookId: string, verdict: Verdict) => void;
  removeFind: (bookId: string) => void;
  clearFinds: () => void;
}
const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState(loadProfile);
  const [results, setResults] = useState<ScoredBook[]>([]);
  const [finds, setFindsState] = useState(loadFinds);

  const setProfile = useCallback((p: TasteProfile) => { saveProfile(p); setProfileState(p); }, []);
  const updateFinds = useCallback((fn: (f: Find[]) => Find[]) => {
    setFindsState((prev) => { const next = fn(prev); saveFinds(next); return next; });
  }, []);

  const recordDecision = useCallback((item: ScoredBook, decision: Decision) => {
    updateFinds((prev) => [
      { ...item, decision, date: new Date().toISOString() },
      ...prev.filter((f) => f.book.id !== item.book.id),
    ]);
  }, [updateFinds]);
  const setVerdict = useCallback((bookId: string, verdict: Verdict) => {
    updateFinds((prev) => prev.map((f) => (f.book.id === bookId ? { ...f, verdict } : f)));
  }, [updateFinds]);
  const removeFind = useCallback((bookId: string) => {
    updateFinds((prev) => prev.filter((f) => f.book.id !== bookId));
  }, [updateFinds]);
  const clearFinds = useCallback(() => updateFinds(() => []), [updateFinds]);

  const value = useMemo(
    () => ({ profile, setProfile, results, setResults, finds, recordDecision, setVerdict, removeFind, clearFinds }),
    [profile, setProfile, results, finds, recordDecision, setVerdict, removeFind, clearFinds],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppStateProvider missing');
  return v;
}
