import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { installGlobalErrorHandlers } from './utils/globalErrors';
import './i18n';
import './index.css';

installGlobalErrorHandlers();

function AppShell() {
  const { i18n } = useTranslation();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          className: 'i18n-toast',
          style: {
            background: resolvedTheme === 'dark' ? '#1e293b' : '#ffffff',
            color: resolvedTheme === 'dark' ? '#f1f5f9' : '#1e293b',
            border: `1px solid ${resolvedTheme === 'dark' ? '#334155' : '#e2e8f0'}`,
          },
        }}
        containerStyle={{
          left: 0,
          top: 0,
          padding: '16px',
        }}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
