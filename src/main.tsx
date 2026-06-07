import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { RouteFallback } from './app/RouteFallback';
import './index.css';

const App = lazy(() => import('./App.tsx'));
const SharePage = lazy(() => import('./pages/SharePage.tsx'));
const GalleryPage = lazy(() => import('./pages/GalleryPage.tsx'));
const ScreenPage = lazy(() => import('./pages/ScreenPage.tsx'));

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/share/:id" element={<SharePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/ecran" element={<ScreenPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
