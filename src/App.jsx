
import { Navigate, Route, Routes } from 'react-router-dom'

// Components and Guards
import { PublicOnly, RequireRole } from './components/Guards'
import PWAInstallGuard from './components/PWAInstallGuard'
import ResidentLayout from './components/ResidentLayout'
import AdminLayout from './components/AdminLayout'

// Public Pages
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import PublicDirectory from './pages/public/PublicDirectory'
import NotFound from './pages/public/NotFound'

// Resident Pages
import ResidentDashboard from './pages/resident/Dashboard'
import Profile from './pages/resident/Profile'
import Track from './pages/resident/Track'
import ComplaintNew from './pages/resident/ComplaintNew'
import SmartClassify from './pages/resident/SmartClassify'
import ReportNew from './pages/resident/ReportNew'
import TrackDetail from './pages/resident/TrackDetail'
import ResidentAnnouncements from './pages/resident/Announcements'
import FileHub from './pages/resident/FileHub'
import VisitorLog from './pages/admin/VisitorLog'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import ResidentsView from './pages/admin/ResidentsView'
import ComplaintsView from './pages/admin/ComplaintsView'
import DepartmentsView from './pages/admin/DepartmentsView'
import ApplicationReview from './pages/admin/ApplicationReview'
import LocationVerificationPage from './pages/admin/LocationVerificationPage'
import DocumentVerificationPage from './pages/admin/DocumentVerificationPage'

// Admin Module Pages
import {
  ReportsPage,
  OperationsPage,
  AnnouncementsPage,
  AuditLogsPage,
  CommunityIssuesPage,
  ApplicationsPage,
} from './pages/admin/modulePages'


// ============================================
// PWA INSTALLATION DETECTION
// ============================================

function isPWAInstalled() {
  const standalone = window.matchMedia(
    '(display-mode: standalone)'
  ).matches

  const fullscreen = window.matchMedia(
    '(display-mode: fullscreen)'
  ).matches

  const minimalUI = window.matchMedia(
    '(display-mode: minimal-ui)'
  ).matches

  const iosStandalone = window.navigator.standalone === true

  return (
    standalone ||
    fullscreen ||
    minimalUI ||
    iosStandalone
  )
}


// ============================================
// HOME ROUTE
//
// Normal Browser:
// Display Public Landing Page
//
// Installed PWA:
// Redirect to Login
//
// PublicOnly will redirect authenticated
// users to their assigned dashboard.
// ============================================

function HomeRoute() {
  if (isPWAInstalled()) {
    return <Navigate to="/login" replace />
  }

  return <Landing />
}


// ============================================
// MAIN APPLICATION ROUTES
// ============================================

export default function App() {
  return (
    <Routes>

      {/* ======================================
          PUBLIC ROUTES
      ====================================== */}

      <Route
        path="/"
        element={<HomeRoute />}
      />

      <Route
        path="/login"
        element={
          <PWAInstallGuard>
            <PublicOnly>
              <Login />
            </PublicOnly>
          </PWAInstallGuard>
        }
      />

      <Route
        path="/register"
        element={
          <PWAInstallGuard>
            <PublicOnly>
              <Register />
            </PublicOnly>
          </PWAInstallGuard>
        }
      />

      {/* Public Information Pages */}

      <Route
        path="/directory"
        element={<PublicDirectory />}
      />

      <Route
        path="/officials"
        element={<PublicDirectory />}
      />

      <Route
        path="/departments"
        element={<PublicDirectory />}
      />


      {/* ======================================
          RESIDENT ROUTES
      ====================================== */}

      <Route
        path="/resident"
        element={
          <PWAInstallGuard>
            <RequireRole role="Resident">
              <ResidentLayout />
            </RequireRole>
          </PWAInstallGuard>
        }
      >

        <Route
          index
          element={<ResidentDashboard />}
        />

        <Route
          path="profile"
          element={<Profile />}
        />

        <Route
          path="complaints"
          element={<Track />}
        />

        <Route
          path="complaints/new"
          element={<ComplaintNew />}
        />

        <Route
          path="classify"
          element={<SmartClassify />}
        />

        <Route
          path="reports/new"
          element={<ReportNew />}
        />

        <Route
          path="track/:kind/:id"
          element={<TrackDetail />}
        />

        <Route
          path="announcements"
          element={<ResidentAnnouncements />}
        />

        <Route
          path="directory"
          element={<PublicDirectory />}
        />

        <Route
          path="officials"
          element={<PublicDirectory />}
        />

        <Route
          path="departments"
          element={<PublicDirectory />}
        />

      </Route>


      {/* ======================================
          ADMIN ROUTES
      ====================================== */}

      <Route
        path="/admin"
        element={
          <PWAInstallGuard>
            <RequireRole role="Admin" allowStaff>
              <AdminLayout />
            </RequireRole>
          </PWAInstallGuard>
        }
      >

        <Route
          index
          element={<AdminDashboard />}
        />

        <Route
          path="residents"
          element={<ResidentsView />}
        />

        <Route
          path="complaints"
          element={<ComplaintsView />}
        />

        <Route
          path="reports"
          element={<ReportsPage />}
        />

        <Route
          path="operations"
          element={<OperationsPage />}
        />

        <Route
          path="announcements"
          element={<AnnouncementsPage />}
        />

        <Route
          path="audit-logs"
          element={<AuditLogsPage />}
        />

        <Route
          path="community-issues"
          element={<CommunityIssuesPage />}
        />

        <Route
          path="officials"
          element={<DepartmentsView />}
        />

        <Route
          path="applications"
          element={<ApplicationsPage />}
        />

        <Route
          path="applications/:id"
          element={<ApplicationReview />}
        />

        <Route
          path="location-verification"
          element={<LocationVerificationPage />}
        />

        <Route
          path="document-verification"
          element={<DocumentVerificationPage />}
        />

        <Route
          path="file"
          element={<FileHub />}
        />
        <Route
          path="visitors"
          element={<VisitorLog />}
        />

      </Route>


      {/* ======================================
          404 - NOT FOUND
      ====================================== */}

      <Route
        path="*"
        element={<NotFound />}
      />

    </Routes>
  )
}
