export default function AppHeader() {
  return <>
    <header className="topbar">
      <a className="brand" href="#" aria-label="Alpharino home">
        <span className="brand-mark">A</span>
        <span className="brand-name">alpharino<span>.</span></span>
      </a>
      <span className="privacy-pill"><span className="privacy-dot" />Private by design</span>
    </header>
    <section className="hero">
      <div>
        <p className="eyebrow"><span className="eyebrow-line" />CREATOR TOOLKIT</p>
        <h1>One workspace.<br /><span>Every kind of page.</span></h1>
        <p className="hero-copy">Prepare pages for print, social, web, or your tablet. Your files stay on your device.</p>
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="art-sparkle sparkle-one">✳</span>
        <span className="art-sparkle sparkle-two">✦</span>
        <div className="art-page"><span /><span /><span /><i>A</i></div>
      </div>
    </section>
    <nav className="steps" aria-label="Resize steps">
      <span className="step active"><i>01</i> Add files</span>
      <span className="step-divider" />
      <span className="step"><i>02</i> Customize</span>
      <span className="step-divider" />
      <span className="step"><i>03</i> Export</span>
    </nav>
  </>;
}
