import ResourcePage from './ResourcePage'
import * as m from './modules'

export default function LocationVerificationPage() {
  return <ResourcePage config={{ ...m.applications, title: 'Geographic Verification', searchPlaceholder: 'Search by name, location, or status' }} />
}