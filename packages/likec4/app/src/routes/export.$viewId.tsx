import { StaticLikeC4Diagram } from '@likec4/diagram'
import { createFileRoute } from '@tanstack/react-router'
import { useLikeC4View } from 'virtual:likec4'
import { DiagramNotFound } from '../components'
import { useTransparentBackground } from '../useTransparentBackground'

// const asPadding = (v: unknown) => {
//   const parsed = typeof v === 'string' ? parseFloat(v) : undefined
//   if (parsed && isFinite(parsed) && isNaN(parsed) === false) {
//     return Math.round(parsed)
//   }
//   return undefined
// }

export const Route = createFileRoute('/export/$viewId')({
  component: ExportPage
})

function ExportPage() {
  const { padding = 22 } = Route.useSearch()
  const { viewId } = Route.useParams()
  const diagram = useLikeC4View(viewId)

  useTransparentBackground(!!diagram)

  if (!diagram) {
    return <DiagramNotFound viewId={viewId} />
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        minWidth: diagram.width + padding * 2,
        minHeight: diagram.height + padding * 2,
        padding,
        width: '100vw',
        height: '100vh'
      }}>
      <StaticLikeC4Diagram
        view={diagram}
        fitView={false}
        fitViewPadding={0}
        initialWidth={diagram.width}
        initialHeight={diagram.height}
        background={'transparent'}
      />
    </div>
  )
}
