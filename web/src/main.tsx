import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.tsx';
import { AppStateProvider } from './lib/state.tsx';
import Home from './screens/Home.tsx';
import Shelf from './screens/Shelf.tsx';
import BookDetail from './screens/BookDetail.tsx';
import Finds from './screens/Finds.tsx';
import Profile from './screens/Profile.tsx';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AppStateProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shelf" element={<Shelf />} />
            <Route path="/book/:id" element={<BookDetail />} />
            <Route path="/finds" element={<Finds />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </HashRouter>
      </AppStateProvider>
    </I18nProvider>
  </StrictMode>,
);
