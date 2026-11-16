
import { Navigate, Route, Routes } from 'react-router-dom'

// Components and Guards
import { PublicOnly, RequireAdminPermission, RequireRole } from './components/Guards'
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
  OfficialsPage,
} from './pages/admin/modulePages'
import ComplaintSchedulingPage from './pages/admin/ComplaintSchedulingPage'
import ResidentComplaintAppointments from './pages/resident/ComplaintAppointments'
import { defaultAdminPath } from './lib/adminNavigation'
import { useAuth } from './context/AuthContext'


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

function AdminHomeRoute() {
  const { role } = useAuth()
  const path = defaultAdminPath(role)
  return path === '/admin' ? <AdminDashboard /> : <Navigate to={path} replace />
}

function AdminNoAccess() {
  return (
    <section className="card" role="status" style={{ maxWidth: '640px', margin: '2rem auto' }}>
      <h1 style={{ marginTop: 0 }}>No administrative modules assigned</h1>
      <p className="muted" style={{ marginBottom: 0 }}>
        Your account does not currently have an assigned administrative workspace. Contact the OIC for access.
      </p>
    </section>
  )
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
          path="complaints/schedules"
          element={<ResidentComplaintAppointments />}
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
          element={<AdminHomeRoute />}
        />

        <Route
          path="residents"
          element={<RequireAdminPermission permission="residents"><ResidentsView /></RequireAdminPermission>}
        />

        <Route
          path="complaints"
          element={<RequireAdminPermission permission="complaints"><ComplaintsView /></RequireAdminPermission>}
        />

        <Route
          path="complaints/scheduling"
          element={<RequireAdminPermission permission="complaintScheduling"><ComplaintSchedulingPage /></RequireAdminPermission>}
        />

        <Route
          path="reports"
          element={<RequireAdminPermission permission="reports"><ReportsPage /></RequireAdminPermission>}
        />

        <Route
          path="operations"
          element={<RequireAdminPermission permission="operations"><OperationsPage /></RequireAdminPermission>}
        />

        <Route
          path="announcements"
          element={<RequireAdminPermission permission="announcements"><AnnouncementsPage /></RequireAdminPermission>}
        />

        <Route
          path="audit-logs"
          element={<RequireAdminPermission permission="audit"><AuditLogsPage /></RequireAdminPermission>}
        />

        <Route
          path="community-issues"
          element={<RequireAdminPermission permission="communityIssues"><CommunityIssuesPage /></RequireAdminPermission>}
        />

        <Route
          path="officials"
          element={<RequireAdminPermission permission="officials"><OfficialsPage /></RequireAdminPermission>}
        />

        <Route
          path="departments"
          element={<RequireAdminPermission permission="departments"><DepartmentsView /></RequireAdminPermission>}
        />

        <Route
          path="applications"
          element={<RequireAdminPermission permission="applications"><ApplicationsPage /></RequireAdminPermission>}
        />

        <Route
          path="applications/:id"
          element={<RequireAdminPermission permission="applications"><ApplicationReview /></RequireAdminPermission>}
        />

        <Route
          path="location-verification"
          element={<RequireAdminPermission permission="locationVerification"><LocationVerificationPage /></RequireAdminPermission>}
        />

        <Route
          path="document-verification"
          element={<RequireAdminPermission permission="documentVerification"><DocumentVerificationPage /></RequireAdminPermission>}
        />

        <Route
          path="file"
          element={<RequireAdminPermission permission="files"><FileHub /></RequireAdminPermission>}
        />
        <Route
          path="visitors"
          element={<RequireAdminPermission permission="visitors"><VisitorLog /></RequireAdminPermission>}
        />
        <Route
          path="no-access"
          element={<AdminNoAccess />}
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
