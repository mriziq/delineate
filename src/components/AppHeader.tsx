import { DelineateIcon } from './DelineateIcon'

export default function AppHeader() {
  return (
    <div className="app-header">
      <DelineateIcon size={20} />
      <style>{`
        .app-header {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
