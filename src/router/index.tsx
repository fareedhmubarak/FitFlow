import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import MobileLayout from '../components/layout/MobileLayout';

// Auth Pages
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import ForgotPassword from '../pages/auth/ForgotPassword';
import AuthCallback from '../pages/auth/AuthCallback';
import VerifyEmail from '../pages/auth/VerifyEmail';
import GymOnboarding from '../pages/auth/GymOnboarding';

// Dashboard - Using New Enhanced Dashboard
import Dashboard from '../pages/dashboard/Dashboard';

// Other Pages
import NotFound from '../pages/NotFound';

// Members
import MembersList from '../pages/members/MembersList';
import MemberDetails from '../pages/members/MemberDetails';
import AddMember from '../pages/members/AddMember';
import EditMember from '../pages/members/EditMember';

// Payments
import PaymentCalendar from '../pages/payments/PaymentCalendar';
import PaymentsList from '../pages/payments/PaymentsList';
import PaymentRecords from '../pages/payments/PaymentRecords';

// Calendar - Unique Feature
import CalendarPage from '../pages/calendar/CalendarPage';

// Plans Management
import PlansPage from '../pages/plans/PlansPage';

// Classes
import ClassesList from '../pages/classes/ClassesList';
import ClassSchedule from '../pages/classes/ClassSchedule';

// Check-in
import CheckIn from '../pages/checkin/CheckIn';

// Staff
import StaffList from '../pages/staff/StaffList';

// Leads
import LeadsList from '../pages/leads/LeadsList';

// Reports
import ReportsDashboard from '../pages/reports/ReportsDashboard';

// Settings
import Settings from '../pages/settings/Settings';

// Debug Dashboard - Development Only
import DebugDashboard from '../pages/debug/DebugDashboard';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
  {
    path: '/auth/verify',
    element: <VerifyEmail />,
  },
  {
    path: '/onboarding',
    element: <GymOnboarding />,
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
        element: <MembersList />,
      },
      {
        path: 'members/new',
        element: <AddMember />,
      },
      {
        path: 'members/:memberId',
        element: <MemberDetails />,
      },
      {
        path: 'members/:memberId/edit',
        element: <EditMember />,
      },
      {
        path: 'payments',
        element: <PaymentCalendar />,
      },
      {
        path: 'payments/records',
        element: <PaymentRecords />,
      },
      {
        path: 'payments/list',
        element: <PaymentsList />,
      },
      // New Calendar Route - Unique Feature
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
      // New Plans Management Route
      {
        path: 'plans',
        element: <PlansPage />,
      },
      {
        path: 'classes',
        element: <ClassesList />,
      },
      {
        path: 'classes/schedule',
        element: <ClassSchedule />,
      },
      {
        path: 'checkin',
        element: <CheckIn />,
      },
      {
        path: 'staff',
        element: <StaffList />,
      },
      {
        path: 'leads',
        element: <LeadsList />,
      },
      {
        path: 'reports',
        element: <ReportsDashboard />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'debug',
        element: import.meta.env.DEV ? <DebugDashboard /> : <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
