import type { DiagramView } from '@likec4/core'
import { Spotlight, SpotlightActionsGroup, type SpotlightActionData } from '@mantine/spotlight'
import { IconRectangularPrism, IconSitemap, IconSearch } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { filter, map, pipe } from 'remeda'
import { useDiagramStoreApi } from './hooks'
import { useLikeC4Model } from './likec4model'
import { Group, Text } from '@mantine/core'

interface FilterMatch {
  keyword: string,
  start: number,
  length: number
}

function actionFilterFunction(node: SpotlightActionData, query: string) : FilterMatch | undefined {
  const queryLower = query.toLowerCase();
  const keywords = Array.isArray(node.keywords) ? node.keywords : [];
  return keywords
    .map(keyword => {
      const index = keyword.toLowerCase().indexOf(queryLower);
      return index !== -1 ? {
        keyword: keyword,
        start: index,
        length: query.length
      } : null;
    })
    .find(match => !!match);
}

function highlightMatch(match: FilterMatch) {
  return <span>
    {match.keyword.substring(0, match.start)}
    <b><u>{match.keyword.substring(match.start, match.start + match.length)}</u></b>
    {match.keyword.substring(match.start + match.length)}
  </span>
}

function buildSpotlightAction(dataMatch: { data: SpotlightActionData, match: FilterMatch | undefined}, query: string) {
  const isMatchInLabel = !!query && dataMatch.match?.keyword == dataMatch.data.label;
  return <Spotlight.Action leftSection={dataMatch.data.leftSection} onClick={dataMatch.data.onClick}>
    <Group wrap="nowrap" w="100%">
      <div style={{ flex: 1 }}>
        <Text>
          {isMatchInLabel ? highlightMatch(dataMatch.match!) : dataMatch.data.label}
        </Text>
        {!!query && !isMatchInLabel && (
          <Text opacity={0.6} size="xs">
            {highlightMatch(dataMatch.match!)}
          </Text>
        )}
      </div>
    </Group>
  </Spotlight.Action>
}

export function LikeC4Search({ view }: { view: DiagramView }) {
  const model = useLikeC4Model(true)
  const store = useDiagramStoreApi()
  const [ query, setQuery ] = useState('')

  const getNodeActionsData = (): SpotlightActionData[] => {
    const { focusOnNode } = store.getState()

    return pipe(
      view.nodes,
      filter(n => !!n.title),
      map(n => ({
        id: n.id,
        label: n.title,
        keywords: [
          n.title,
          ...(n.tags ?? []).map(t => `#${t}`),
          ...(n.description ? [n.description] : [])
        ].filter(k => k.toLowerCase()),
        onClick: () => focusOnNode(n.id),
        leftSection: <IconRectangularPrism />
      }))
    );
  }

  const nodeActions = pipe(
    useMemo(getNodeActionsData, [model, store, view]),
    map(n => ({
      data: n,
      match: actionFilterFunction(n, query)
    })),
    filter(nm => !!nm.match),
    map(nm => buildSpotlightAction(nm, query))
  );

  const getViewActionsData = (): SpotlightActionData[] => {
    const { onNavigateTo } = store.getState()
    const views = model.views()

    return map(views, v => ({
      id: v.id,
      label: v.title ?? v.id,
      keywords: [
        v.id,
        ...(v.tags ?? []),
        ...(v.view.description ? [v.view.description] : [])
      ],
      onClick: () => {
        store.setState({
          hoveredNodeId: null,
          lastOnNavigate: {
            fromView: view.id,
            toView: v.id,
            fromNode: null
          }
        })
        onNavigateTo?.(v.id)
      },
      leftSection: <IconSitemap />
    }));
  }

  const viewActions = pipe(
    useMemo(getViewActionsData, [model, store, view]),
    map(v => ({
      data: v,
      match: actionFilterFunction(v, query)
    })),
    filter(vm => !!vm.match),
    map(vm => buildSpotlightAction(vm, query))
  );

  return (
    <Spotlight.Root shortcut={['ctrl + f']} query={query} onQueryChange={setQuery}>
      <Spotlight.Search placeholder="Search elements in current view and other views..." leftSection={<IconSearch stroke={1.5} />} />
      <Spotlight.ActionsList>
      {nodeActions.length > 0 && <SpotlightActionsGroup label="Elements">{nodeActions}</SpotlightActionsGroup> }
      {viewActions.length > 0 && <SpotlightActionsGroup label="Views">{viewActions}</SpotlightActionsGroup> }
      {nodeActions.length == 0 && viewActions.length == 0 && <Spotlight.Empty>Nothing found...</Spotlight.Empty> }
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
}
