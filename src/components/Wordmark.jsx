export default function Wordmark({ onDark = false }) {
  return (
    <span className={`wordmark${onDark ? ' on-dark' : ''}`}>
      <span className="wm-a">TOP</span>
      <span className="wm-b">DANÇI</span>
    </span>
  )
}
