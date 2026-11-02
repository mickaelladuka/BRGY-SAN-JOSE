
import { Navigate, Route, Routes } from 'react-router-dom'

import { PublicOnly, RequireRole } from './components/Guards'
import PWAInstallGuard from './components/PWAInstallGuard'

import ResidentLayout from './components/ResidentLayout'
import AdminLayout from './components/AdminLayout'

// Public Pages
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import PublicDirectory from './pages/public/PublicDirectory'

// Resident Pages
import ResidentDashboard from './pages/resident/ResidentDashboard'
import Profile from './pages/resident/Profile'
import Track from './pages/resident/Track'
import ComplaintNew from './pages/resident/ComplaintNew'
import SmartClassify from './pages/resident/SmartClassify'
import ReportNew from './pages/resident/ReportNew'
import TrackDetail from './pages/resident/TrackDetail'
import ResidentAnnouncements from './pages/resident/ResidentAnnouncements'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import ResidentsView from './pages/admin/ResidentsView'
import ComplaintsView from './pages/admin/ComplaintsView'
import ReportsPage from './pages/admin/ReportsPage'
import OperationsPage from './pages/admin/OperationsPage'
import AnnouncementsPage from './pages/admin/AnnouncementsPage'
import AuditLogsPage from './pages/admin/AuditLogsPage'
import CommunityIssuesPage from './pages/admin/CommunityIssuesPage'
import DepartmentsView from './pages/admin/DepartmentsView'
import ApplicationsPage from './pages/admin/ApplicationsPage'
import ApplicationReview from './pages/admin/ApplicationReview'
import LocationVerificationPage from './pages/admin/LocationVerificationPage'
import DocumentVerificationPage from './pages/admin/DocumentVerificationPage'
import FileHub from './pages/admin/FileHub'

// Other Pages
import NotFound from './pages/NotFound'


// ============================================
// PWA DETECTION
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
// Browser = Landing Page
// Installed PWA = Login Page
// ============================================

function HomeRoute() {
  if (isPWAInstalled()) {
    return <Navigate to="/login" replace />
  }

  return <Landing />
}


// ============================================
// MAIN APP
// ============================================

export default function App() {
  return (
    <Routes>

      {/* ======================================
          PUBLIC ROUTES
      ====================================== */}

      <Route path="/" element={<HomeRoute />} />

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

      <Route path="/directory" element={<PublicDirectory />} />
      <Route path="/officials" element={<PublicDirectory />} />
      <Route path="/departments" element={<PublicDirectory />} />


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
        <Route index element={<ResidentDashboard />} />

        <Route path="profile" element={<Profile />} />

        <Route path="complaints" element={<Track />} />

        <Route path="complaints/new" element={<ComplaintNew />} />

        <Route path="classify" element={<SmartClassify />} />

        <Route path="reports/new" element={<ReportNew />} />

        <Route
          path="track/:kind/:id"
          element={<TrackDetail />}
        />

        <Route
          path="announcements"
          element={<ResidentAnnouncements />}
        />

        <Route path="directory" element={<PublicDirectory />} />

        <Route path="officials" element={<PublicDirectory />} />

        <Route path="departments" element={<PublicDirectory />} />
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
        <Route index element={<AdminDashboard />} />

        <Route path="residents" element={<ResidentsView />} />

        <Route path="complaints" element={<ComplaintsView />} />

        <Route path="reports" element={<ReportsPage />} />

        <Route path="operations" element={<OperationsPage />} />

        <Route
          path="announcements"
          element={<AnnouncementsPage />}
        />

        <Route path="audit-logs" element={<AuditLogsPage />} />

        <Route
          path="community-issues"
          element={<CommunityIssuesPage />}
        />

        <Route path="officials" element={<DepartmentsView />} />

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

        <Route path="file" element={<FileHub />} />
      </Route>


      {/* ======================================
          404 NOT FOUND
      ====================================== */}

      <Route path="*" element={<NotFound />} />

    </Routes>
  )
}
