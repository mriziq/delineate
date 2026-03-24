interface Props {
  onClose: () => void
}

const SECTIONS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Space', '→', 'Enter'], desc: 'Next card (skip if unchanged)' },
      { keys: ['←'], desc: 'Go back one card' },
    ],
  },
  {
    title: 'Priority',
    shortcuts: [
      { keys: ['1'], desc: 'Urgent' },
      { keys: ['2'], desc: 'High' },
      { keys: ['3'], desc: 'Medium' },
      { keys: ['4'], desc: 'Low' },
    ],
  },
  {
    title: 'Fields',
    shortcuts: [
      { keys: ['E'], desc: 'Estimate (1/2/3/5/8/9/0)' },
      { keys: ['L'], desc: 'Label picker' },
      { keys: ['A'], desc: 'Assignee picker' },
      { keys: ['P'], desc: 'Project picker' },
      { keys: ['0', 'Click'], desc: 'Expand issue detail' },
    ],
  },
  {
    title: 'Other',
    shortcuts: [
      { keys: ['R'], desc: 'Toggle review drawer' },
      { keys: ['Z'], desc: 'Undo changes on card' },
      { keys: ['T'], desc: 'Toggle light/dark theme' },
      { keys: ['Esc'], desc: 'Close overlay / detail' },
      { keys: ['?'], desc: 'Toggle this modal' },
    ],
  },
]

export default function CheatsheetModal({ onClose }: Props) {
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel cheatsheet-panel" onClick={e => e.stopPropagation()}>
        <h3 className="overlay-title">Keyboard Shortcuts</h3>
        <div className="cheatsheet-sections">
          {SECTIONS.map(section => (
            <div key={section.title} className="cheatsheet-section">
              <h4 className="cheatsheet-section-title">{section.title}</h4>
              {section.shortcuts.map((sc, idx) => (
                <div key={idx} className="cheatsheet-row">
                  <div className="cheatsheet-keys">
                    {sc.keys.map(k => <kbd key={k} className="shortcut-key">{k}</kbd>)}
                  </div>
                  <span className="cheatsheet-desc">{sc.desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="cheatsheet-dismiss">Press Esc or ? to close</p>
      </div>
      <style>{`
        .cheatsheet-panel {
          max-width: 480px;
        }
        .cheatsheet-sections {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-4);
          margin-top: var(--sp-4);
        }
        .cheatsheet-section-title {
          font-size: 0.72rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          margin-bottom: var(--sp-2);
        }
        .cheatsheet-row {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          margin-bottom: var(--sp-1);
        }
        .cheatsheet-keys {
          display: flex;
          gap: 2px;
          min-width: 80px;
        }
        .cheatsheet-desc {
          font-size: 0.875rem;
          font-weight: 400;
          color: var(--text-secondary);
        }
        .cheatsheet-dismiss {
          text-align: center;
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: var(--sp-4);
        }
      `}</style>
    </div>
  )
}
