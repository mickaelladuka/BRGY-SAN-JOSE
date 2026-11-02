import ResourcePage from './ResourcePage'
import * as m from './modules'

export default function DocumentVerificationPage() {
  return <ResourcePage config={{ ...m.applications, title: 'Document Verification', searchPlaceholder: 'Search by name, email, or status' }} />
}