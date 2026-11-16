import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field } from '../../components/ui'
import { ClipboardList, MessageSquareText } from 'lucide-react'

const REPORT_KEYWORDS = ['sira', 'nasira', 'baha', 'bara', 'stray', 'basura', 'streetlight', 'drainage', 'pothole', 'obstruction', 'hazard', 'leak', 'overflow', 'trash', 'debris', 'bumagsak', 'gumuho', 'walang', 'hindi', 'gumagana', 'nasiraan', 'wasak', 'giba', 'busted', 'broken', 'flood', 'blocked', 'obstructed', 'garbage', 'waste', 'stray', 'animal', 'dog', 'cat', 'street', 'light', 'lamp', 'post', 'road', 'sidewalk', 'drain', 'pipe', 'water', 'electricity', 'power', 'outage', 'blackout']
const COMPLAINT_KEYWORDS = ['away', 'ingay', 'harassment', 'kapitbahay', 'property', 'boundary', 'conflict', 'misconduct', 'disturbance', 'threat', 'intimidation', 'nuisance', 'trespass', 'reklamo', 'gulo', 'awayan', 'sigaw', 'maingay', 'banta', 'nagbanta', 'nagtataka', 'nanakot', 'nananakot', 'pananakot', 'harass', 'bully', 'bullying', 'abuse', 'abuso', 'violence', 'karahasan', 'suntok', 'saktan', 'bugbog', 'talo', 'sigaw', 'sumbong', 'reklamo', 'dispute', 'quarrel', 'fight', 'pagtatalo', 'pag-aaway', 'pag-aawayan', 'land', 'lupa', 'bakod', 'border', 'territory', 'teritoryo', 'intrusion', 'pumasok', 'pumapasok', 'unauthorized', 'walang pahintulot', 'without permission', 'noise', 'maingay', 'tahimik', 'quiet', 'disturb', 'disturbo', 'disturbance', 'peace', 'kapayapaan', 'order', 'kaayusan']

export default function SmartClassify() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)

  const analyze = () => {
    const lower = text.toLowerCase()
    const reportScore = REPORT_KEYWORDS.filter((k) => lower.includes(k)).length
    const complaintScore = COMPLAINT_KEYWORDS.filter((k) => lower.includes(k)).length

    // Strong complaint indicators (threats, harassment, disputes) always favor complaint
    const strongComplaint = ['banta', 'nagbanta', 'nanakot', 'nananakot', 'pananakot', 'harassment', 'harass', 'away', 'reklamo', 'sumbong', 'dispute', 'quarrel', 'fight', 'pagtatalo', 'pag-aaway']
    const hasStrongComplaint = strongComplaint.some((k) => lower.includes(k))

    // Strong report indicators (infrastructure, hazards) always favor report
    const strongReport = ['sira', 'baha', 'bara', 'basura', 'streetlight', 'drainage', 'pothole', 'flood', 'broken', 'damaged']
    const hasStrongReport = strongReport.some((k) => lower.includes(k))

    if (hasStrongComplaint && !hasStrongReport) {
      setResult({ type: 'complaint', reason: 'Ang iyong concern ay tungkol sa isang banta, away, o conflict na kailangan ng interbensyon ng barangay. Inirerekomenda ang Complaint.', confidence: 'high' })
    } else if (hasStrongReport && !hasStrongComplaint) {
      setResult({ type: 'report', reason: 'Ang iyong concern ay tungkol sa isang insidente o hazard sa komunidad. Inirerekomenda ang Report.', confidence: 'high' })
    } else if (reportScore > complaintScore) {
      setResult({ type: 'report', reason: 'Ang iyong concern ay mukhang tungkol sa isang insidente o hazard sa komunidad na maaaring i-verify at aksyunan ng mga barangay official.', confidence: 'high' })
    } else if (complaintScore > reportScore) {
      setResult({ type: 'complaint', reason: 'Ang iyong concern ay mukhang formal na reklamo na kinasasangkutan ng away o conflict na maaaring kailanganin ng interbensyon ng barangay.', confidence: 'high' })
    } else if (text.trim().length > 10) {
      setResult({ type: 'uncertain', reason: 'Base sa iyong paglalarawan, maaaring Report o Complaint ito. Basahin ang mga pagpipilian sa ibaba para pumili ng tama.', confidence: 'low' })
    } else {
      setResult(null)
    }
  }

  return (
    <div className="resident-classify-page">
      <header className="resident-page-heading"><span className="resident-eyebrow">HELP CHOOSING A SERVICE</span><h1>Anong uri ng concern?</h1><p>We'll help you choose between a community report and a formal complaint.</p></header>
      <p className="muted">Hindi ka sigurado kung Report o Complaint ang dapat i-file? Ilarawan ang iyong concern at tutulungan ka naming pumili.</p>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <Field label="Ilarawan ang iyong concern" htmlFor="concern">
          <textarea id="concern" value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Halimbawa: May sira na streetlight sa aming kalye, o maingay ang kapitbahay tuwing gabi..." />
        </Field>
        <button type="button" className="btn btn-primary btn-block" onClick={analyze} disabled={text.trim().length < 5}>Suriin</button>
      </div>

      {result && (
        <div className="card" style={{ borderLeft: `4px solid ${result.type === 'report' ? '#287A4B' : result.type === 'complaint' ? '#C63F0A' : '#A85D08'}` }}>
          <h3 style={{ marginBottom: '.5rem' }}>
            {result.type === 'report' ? '📋 Rekomendasyon: Mag-file ng Report' : result.type === 'complaint' ? '📝 Rekomendasyon: Mag-file ng Complaint' : '🤔 Basahin ang dalawang pagpipilian'}
          </h3>
          <p className="muted" style={{ marginBottom: '1rem' }}>{result.reason}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                <ClipboardList size={18} strokeWidth={1.75} style={{ color: '#287A4B' }} />
                <strong>Report</strong>
              </div>
              <p style={{ fontSize: '.8rem', color: 'var(--muted-c)', margin: 0 }}>Para sa mga insidente, hazard, at obserbasyon sa komunidad. I-ve-verify at aksyunan ng mga barangay official.</p>
              <p style={{ fontSize: '.75rem', color: 'var(--muted-c)', marginTop: '.5rem', margin: 0 }}><strong>Halimbawa:</strong> Sirang streetlight, baha, bara sa drainage, stray animals, sirang pasilidad</p>
            </div>
            <div style={{ padding: '.75rem', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--cream)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                <MessageSquareText size={18} strokeWidth={1.75} style={{ color: '#C63F0A' }} />
                <strong>Complaint</strong>
              </div>
              <p style={{ fontSize: '.8rem', color: 'var(--muted-c)', margin: 0 }}>Para sa formal na reklamo na kinasasangkutan ng away, conflict, o misconduct na kailangan ng interbensyon ng barangay.</p>
              <p style={{ fontSize: '.75rem', color: 'var(--muted-c)', marginTop: '.5rem', margin: 0 }}><strong>Halimbawa:</strong> Away ng kapitbahay, ingay, harassment, pinsala sa property, boundary dispute</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '.75rem' }}>
            <Link to="/resident/reports/new" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Mag-file ng Report</Link>
            <Link to="/resident/complaints/new" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Mag-file ng Complaint</Link>
          </div>
        </div>
      )}
    </div>
  )
}
