import { Route, Routes } from 'react-router-dom'
import { PublicOnly, RequireRole } from './components/Guards'
import ResidentLayout from './components/ResidentLayout'
import AdminLayout from './components/AdminLayout'
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import Register from './pages/public/Register'

import NotFound from './pages/public/NotFound'
import ResidentDashboard from './pages/resident/Dashboard'
import Profile from './pages/resident/Profile'
import Track from './pages/resident/Track'
import TrackDetail from './pages/resident/TrackDetail'
import ComplaintNew from './pages/resident/ComplaintNew'
import ReportNew from './pages/resident/ReportNew'
import ResidentAnnouncements from './pages/resident/Announcements'
import AdminDashboard from './pages/admin/Dashboard'
import { AnnouncementsPage, ApplicationsPage, AuditLogsPage, CommunityIssuesPage, OfficialsPage, OperationsPage, ReportsPage } from './pages/admin/modulePages'
import ComplaintsView from './pages/admin/ComplaintsView'
import ResidentsView from './pages/admin/ResidentsView'
import ApplicationReview from './pages/admin/ApplicationReview'
import LocationVerificationPage from './pages/admin/LocationVerificationPage'
import DocumentVerificationPage from './pages/admin/DocumentVerificationPage'
import DepartmentsView from './pages/admin/DepartmentsView'
import SmartClassify from './pages/resident/SmartClassify'
import PublicDirectory from './pages/public/PublicDirectory'
import FileHub from './pages/resident/FileHub'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/directory" element={<PublicDirectory />} />
      <Route path="/officials" element={<PublicDirectory />} />
      <Route path="/departments" element={<PublicDirectory />} />


      <Route path="/resident" element={<RequireRole role="Resident"><ResidentLayout /></RequireRole>}>
        <Route index element={<ResidentDashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="complaints" element={<Track />} />
        <Route path="complaints/new" element={<ComplaintNew />} />
        <Route path="classify" element={<SmartClassify />} />
        <Route path="reports/new" element={<ReportNew />} />
        <Route path="track/:kind/:id" element={<TrackDetail />} />
        <Route path="announcements" element={<ResidentAnnouncements />} />
      <Route path="directory" element={<PublicDirectory />} />
      <Route path="officials" element={<PublicDirectory />} />
      <Route path="departments" element={<PublicDirectory />} />
      </Route>

      <Route path="/admin" element={<RequireRole role="Admin" allowStaff><AdminLayout /></RequireRole>}>
        <Route index element={<AdminDashboard />} />
        <Route path="residents" element={<ResidentsView />} />
        <Route path="complaints" element={<ComplaintsView />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="operations" element={<OperationsPage />} />

        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="community-issues" element={<CommunityIssuesPage />} />
        <Route path="officials" element={<DepartmentsView />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationReview />} />
        <Route path="location-verification" element={<LocationVerificationPage />} />
        <Route path="document-verification" element={<DocumentVerificationPage />} />
        <Route path="file" element={<FileHub />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
