import { Link } from 'react-router-dom'
export default function NotFound() {
  return (
    <main className="fullpage"><div className="card receipt"><h1>Page not found</h1><p>The page you are looking for does not exist.</p><Link className="btn btn-primary" to="/">Back to home</Link></div></main>
  )
}
