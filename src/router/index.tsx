import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import MobileLayout from '../components/layout/MobileLayout';
import PageSkeleton from '../components/common/PageSkeleton';

// ── EAGERLY LOADED (critical path) ──────────────────────
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';

// ── LAZILY LOADED (code-split) ──────────────────────────
const Signup = React.lazy(() => import('../pages/auth/Signup'));
const ForgotPassword = React.lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('../pages/auth/ResetPassword'));
const AuthCallback = React.lazy(() => import('../pages/auth/AuthCallback'));
const VerifyEmail = React.lazy(() => import('../pages/auth/VerifyEmail'));
const GymOnboarding = React.lazy(() => import('../pages/auth/GymOnboarding'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

// Core pages (most used)
const MembersList = React.lazy(() => import('../pages/members/MembersList'));
const MemberDetails = React.lazy(() => import('../pages/members/MemberDetails'));
const AddMember = React.lazy(() => import('../pages/members/AddMember'));
const EditMember = React.lazy(() => import('../pages/members/EditMember'));
const CalendarPage = React.lazy(() => import('../pages/calendar/CalendarPage'));
const PaymentRecords = React.lazy(() => import('../pages/payments/PaymentRecords'));

// Secondary pages
const PaymentCalendar = React.lazy(() => import('../pages/payments/PaymentCalendar'));
const PaymentsList = React.lazy(() => import('../pages/payments/PaymentsList'));
const PlansPage = React.lazy(() => import('../pages/plans/PlansPage'));
const ClassesList = React.lazy(() => import('../pages/classes/ClassesList'));
const ClassSchedule = React.lazy(() => import('../pages/classes/ClassSchedule'));
const CheckIn = React.lazy(() => import('../pages/checkin/CheckIn'));
const StaffList = React.lazy(() => import('../pages/staff/StaffList'));
const LeadsList = React.lazy(() => import('../pages/leads/LeadsList'));
const ReportsDashboard = React.lazy(() => import('../pages/reports/ReportsDashboard'));
const Settings = React.lazy(() => import('../pages/settings/Settings'));
const PaymentAuditPage = React.lazy(() => import('../pages/admin/PaymentAuditPage'));
const MonthlyOverviewPage = React.lazy(() => import('../pages/admin/MonthlyOverviewPage'));

// Dev only — fully lazy
const DebugDashboard = React.lazy(() => import('../pages/debug/DebugDashboard'));

// ── Suspense wrapper ────────────────────────────────────
function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

// Root layout
function RootLayout() {
  return <Outlet />;
}


export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/signup',
        element: <Lazy><Signup /></Lazy>,
      },
      {
        path: '/forgot-password',
        element: <Lazy><ForgotPassword /></Lazy>,
      },
      {
        path: '/reset-password',
        element: <Lazy><ResetPassword /></Lazy>,
      },
      {
        path: '/auth/callback',
        element: <Lazy><AuthCallback /></Lazy>,
      },
      {
        path: '/auth/verify',
        element: <Lazy><VerifyEmail /></Lazy>,
      },
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <MobileLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'members',
            element: <Lazy><MembersList /></Lazy>,
          },
          {
            path: 'members/new',
            element: <Lazy><AddMember /></Lazy>,
          },
          {
            path: 'members/:memberId',
            element: <Lazy><MemberDetails /></Lazy>,
          },
          {
            path: 'members/:memberId/edit',
            element: <Lazy><EditMember /></Lazy>,
          },
          {
            path: 'payments',
            element: <Lazy><PaymentCalendar /></Lazy>,
          },
          {
            path: 'payments/records',
            element: <Lazy><PaymentRecords /></Lazy>,
          },
          {
            path: 'payments/list',
            element: <Lazy><PaymentsList /></Lazy>,
          },
          {
            path: 'calendar',
            element: <Lazy><CalendarPage /></Lazy>,
          },
          {
            path: 'plans',
            element: <Lazy><PlansPage /></Lazy>,
          },
          {
            path: 'classes',
            element: <Lazy><ClassesList /></Lazy>,
          },
          {
            path: 'classes/schedule',
            element: <Lazy><ClassSchedule /></Lazy>,
          },
          {
            path: 'checkin',
            element: <Lazy><CheckIn /></Lazy>,
          },
          {
            path: 'staff',
            element: <Lazy><StaffList /></Lazy>,
          },
          {
            path: 'leads',
            element: <Lazy><LeadsList /></Lazy>,
          },
          {
            path: 'reports',
            element: <Lazy><ReportsDashboard /></Lazy>,
          },
          {
            path: 'settings',
            element: <Lazy><Settings /></Lazy>,
          },
          {
            path: 'settings/payment-audit',
            element: <Lazy><PaymentAuditPage /></Lazy>,
          },
          {
            path: 'admin/monthly-overview',
            element: <Lazy><MonthlyOverviewPage /></Lazy>,
          },
          {
            path: 'debug',
            element: import.meta.env.DEV ? <Lazy><DebugDashboard /></Lazy> : <Navigate to="/" replace />,
          },
          {
            path: 'onboarding',
            element: <Lazy><GymOnboarding /></Lazy>,
          },
        ],
      },
      {
        path: '*',
        element: <Lazy><NotFound /></Lazy>,
      },
    ],
  },
]);
