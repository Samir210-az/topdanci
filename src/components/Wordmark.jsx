export default function Wordmark({ onDark = false }) {
  return (
    <span className={`wordmark${onDark ? ' on-dark' : ''}`}>
      <span className="wm-a">Top</span>
      <span className="wm-b">dançı</span>
    </span>
  )
}
