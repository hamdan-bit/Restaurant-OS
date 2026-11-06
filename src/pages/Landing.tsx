import { Link } from 'react-router-dom'
import './Landing.css'

const highlights = [
  ['01', 'One calm command center', 'Bring orders, menus, tables, payments, and reporting into one focused workspace.'],
  ['02', 'Built for every service', 'Give owners, managers, and platform teams the right view without losing the bigger picture.'],
  ['03', 'Ready for your guests', 'Turn every table into a polished digital ordering experience with QR-powered menus.'],
]

export default function Landing() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link className="landing-brand" to="/">
          <span className="landing-mark">F</span>
          <span>FairPrice <em>Restaurant OS</em></span>
        </Link>
        <div className="landing-nav-actions">
          <Link to="/login">Sign in</Link>
          <Link className="landing-nav-cta" to="/signup">Get started <span>↗</span></Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow"><span /> The operating system for modern restaurants</p>
          <h1>Make every service feel <i>effortless.</i></h1>
          <p className="landing-intro">
            FairPrice Restaurant OS brings the moving parts of your restaurant together,
            so your team can spend less time managing systems and more time creating memorable experiences.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-cta" to="/signup">Start your restaurant <span>↗</span></Link>
            <Link className="landing-text-link" to="/login">Already have an account? Sign in</Link>
          </div>
          <div className="landing-trust"><span>✦</span> Designed for ambitious hospitality teams</div>
        </div>
        <div className="landing-visual" aria-label="Restaurant operations dashboard preview">
          <div className="landing-glow" />
          <div className="landing-dashboard-card">
            <div className="preview-top"><span className="preview-logo">fairprice</span><span className="preview-status"><i /> Live service</span></div>
            <div className="preview-heading"><span>Good evening, Manzi Foods</span><strong>Today’s overview</strong></div>
            <div className="preview-metrics"><span><small>Revenue today</small><strong>$4,284</strong><em>+18.4%</em></span><span><small>Orders</small><strong>128</strong><em>+12.8%</em></span></div>
            <div className="preview-chart"><span /><span /><span /><span /><span /><span /><span /></div>
            <div className="preview-footer"><span>Service performance</span><b>Excellent</b></div>
          </div>
          <div className="landing-float landing-float-orders"><small>Orders today</small><strong>128</strong><span>+12.8%</span></div>
          <div className="landing-float landing-float-table"><span className="float-check">✓</span><span><small>Table 08</small><strong>Order served</strong></span></div>
        </div>
      </section>

      <section className="landing-highlights">
        {highlights.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></article>)}
      </section>

      <footer className="landing-footer"><span>FAIRPRICE RESTAURANT OS</span><span>© 2026 · Better service, beautifully managed.</span></footer>
    </main>
  )
}
