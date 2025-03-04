import { ActionIcon, Box, Group, Stack, Text, ThemeIcon, Tooltip as MantineTooltip } from '@mantine/core'
import { IconBoxMultipleFilled, IconZoomScan } from '@tabler/icons-react'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath } from '@xyflow/react'
import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { only } from 'remeda'
import { useDiagramState } from '../../../hooks/useDiagramState'
import { stopPropagation } from '../../../xyflow/utils'
import { useOverlayDialog } from '../../OverlayContext'
import type { XYFlowTypes } from '../_types'
import { ZIndexes } from '../use-layouted-relationships'
import * as css from './styles.css'

const Tooltip = MantineTooltip.withProps({
  color: 'dark',
  fz: 'sm',
  openDelay: 400,
  closeDelay: 150,
  withinPortal: false,
  label: '',
  children: null,
  offset: 4
})

export function RelationshipEdge({
  data,
  label,
  ...props
}: EdgeProps<XYFlowTypes.Edge>) {
  const {
    viewId,
    onNavigateTo
  } = useDiagramState(s => ({
    viewId: s.view.id,
    onNavigateTo: s.onNavigateTo
  }))
  const overlay = useOverlayDialog()
  const [edgePath, labelX, labelY] = getBezierPath(props)
  const navigateTo = onNavigateTo ? only(data.relations)?.navigateTo : undefined
  const isMultiRelation = data.relations.length > 1
  const technology = only(data.relations)?.technology

  return (
    <>
      <g
        className={css.edgeContainer}
        data-edge-dimmed={data.dimmed}
        data-edge-hovered={data.hovered}
        data-likec4-color={data.includedInCurrentView ? 'gray' : 'amber'}
      >
        <BaseEdge
          path={edgePath}
          {...props}
        />
      </g>
      <EdgeLabelRenderer>
        <Stack
          gap={2}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            maxWidth: Math.abs(props.targetX - props.sourceX - 70),
            zIndex: ZIndexes.max
          }}
          className={clsx([
            css.edgeLabel,
            'nodrag nopan'
          ])}
          data-edge-dimmed={data.dimmed}
          data-edge-hovered={data.hovered}
          data-likec4-color={data.includedInCurrentView ? 'gray' : 'amber'}
          // {...data.includedInCurrentView === false && { 'data-likec4-color': 'amber' }}
        >
          {label && (
            <Tooltip label="Not included in current view" disabled={data.includedInCurrentView} color={'orange'}>
              <Group gap={6} wrap="nowrap">
                {isMultiRelation && (
                  <ThemeIcon size={'sm'} variant="transparent" color="orange">
                    <IconBoxMultipleFilled style={{ width: '80%' }} />
                  </ThemeIcon>
                )}
                <Text
                  fw={isMultiRelation ? '500' : '400'}
                  style={{
                    whiteSpace: isMultiRelation ? 'nowrap' : undefined
                  }}
                  component={'div'}
                  className={css.edgeLabelText}
                  lineClamp={3}>
                  {label}
                </Text>
              </Group>
            </Tooltip>
          )}
          {technology && (
            <Text component={'div'} className={css.edgeLabelTechnology}>
              {'[ '}
              {technology}
              {' ]'}
            </Text>
          )}
          {navigateTo && viewId !== navigateTo && (
            <Box ta={'center'} mt={4}>
              <ActionIcon
                variant="default"
                size={'sm'}
                radius="sm"
                onPointerDownCapture={stopPropagation}
                onClick={event => {
                  event.stopPropagation()
                  overlay.close(() => {
                    onNavigateTo?.(navigateTo, event)
                  })
                }}
                role="button"
                onDoubleClick={stopPropagation}
              >
                <IconZoomScan />
              </ActionIcon>
            </Box>
          )}
        </Stack>
      </EdgeLabelRenderer>
    </>
  )
}
