import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { SavingsPage } from './pages/SavingsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SummariesPage } from './pages/SummariesPage';
import { SettingsPage } from './pages/SettingsPage';
import { MyFinancialRecordPage } from './pages/MyFinancialRecordPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { InsightsPage } from './pages/InsightsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        element={
          <PublicOnlyRoute>
            <AuthLayout />
          </PublicOnlyRoute>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/savings" element={<SavingsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/summaries" element={<SummariesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/financial-record" element={<MyFinancialRecordPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/app" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
