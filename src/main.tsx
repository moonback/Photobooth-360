import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import SharePage from './pages/SharePage.tsx';
import GalleryPage from './pages/GalleryPage.tsx';
import ScreenPage from './pages/ScreenPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/ecran" element={<ScreenPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
