import type {
  ComputedEdge,
  ComputedView,
  EdgeId,
  Element,
  ElementView,
  Relation,
  ViewRuleExpression
} from '@likec4/core'
import {
  Expr,
  commonAncestor,
  invariant,
  isAncestor,
  isStrictElementView,
  isViewRuleAutoLayout,
  isViewRuleExpression,
  isViewRuleStyle,
  nonNullable,
  nonexhaustive,
  parentFqn
} from '@likec4/core'
import { first, hasAtLeast, uniq } from 'remeda'
import type { LikeC4ModelGraph } from '../LikeC4ModelGraph'
import {
  excludeElementKindOrTag,
  excludeElementRef,
  excludeInOutExpr,
  excludeIncomingExpr,
  excludeOutgoingExpr,
  excludeRelationExpr,
  excludeWildcardRef,
  includeElementKindOrTag,
  includeElementRef,
  includeInOutExpr,
  includeIncomingExpr,
  includeOutgoingExpr,
  includeRelationExpr,
  includeWildcardRef
} from './compute-predicates'
import { applyViewRuleStyles } from './utils/applyViewRuleStyles'
import { buildComputeNodes } from './utils/buildComputeNodes'
import { sortNodes } from './utils/sortNodes'

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ComputeCtx {
  // Intermediate ComputedEdge
  export interface Edge {
    source: Element
    target: Element
    relations: Relation[]
  }
}

export class ComputeCtx {
  // Intermediate state
  private ctxElements = new Set<Element>()
  private ctxEdges = [] as ComputeCtx.Edge[]

  public static elementView(view: ElementView, graph: LikeC4ModelGraph) {
    return new ComputeCtx(view, graph).compute()
  }

  private constructor(
    protected view: ElementView,
    protected graph: LikeC4ModelGraph
  ) {}

  protected compute(): ComputedView {
    // reset ctx
    this.reset()
    const { rules, ...view } = this.view

    const viewPredicates = rules.filter(isViewRuleExpression)
    if (this.root && viewPredicates.length == 0) {
      this.addElement(this.graph.element(this.root))
    }
    this.processPredicates(viewPredicates)
    this.removeRedundantImplicitEdges()

    const resolvedElements = [...this.elements]
    const nodesMap = buildComputeNodes(resolvedElements)

    const edges = this.computedEdges.map(edge => {
      while (edge.parent && !nodesMap.has(edge.parent)) {
        edge.parent = parentFqn(edge.parent)
      }
      nonNullable(nodesMap.get(edge.source)).outEdges.push(edge.id)
      nonNullable(nodesMap.get(edge.target)).inEdges.push(edge.id)
      return edge
    })

    // nodesMap sorted hierarchically,
    // but we need to keep the initial sort
    const initialSort = resolvedElements.flatMap(e => nodesMap.get(e.id) ?? [])

    const nodes = applyViewRuleStyles(
      rules.filter(isViewRuleStyle),
      // Build graph and apply postorder sort
      sortNodes(initialSort, edges)
    )

    const autoLayoutRule = this.view.rules.find(isViewRuleAutoLayout)
    return {
      ...view,
      autoLayout: autoLayoutRule?.autoLayout ?? 'TB',
      nodes,
      edges
    }
  }

  protected get root() {
    return isStrictElementView(this.view) ? this.view.viewOf : null
  }

  protected get computedEdges(): ComputedEdge[] {
    return this.ctxEdges.map(({ relations, ...e }): ComputedEdge => {
      invariant(hasAtLeast(relations, 1), 'Edge must have at least one relation')
      const source = e.source.id
      const target = e.target.id

      const edge: ComputedEdge = {
        id: `${source}:${target}` as EdgeId,
        parent: commonAncestor(source, target),
        source,
        target,
        label: null,
        relations: relations.map(r => r.id)
      }

      let relation
      if (relations.length === 1) {
        relation = relations[0]
      } else {
        relation = relations.find(r => r.source === source && r.target === target)
      }

      // This edge represents mutliple relations
      // we can't use relation.title, because it is not unique
      if (!relation) {
        const labels = uniq(relations.flatMap(r => (r.title !== '' ? r.title : [])))
        if (hasAtLeast(labels, 1)) {
          if (labels.length === 1) {
            edge.label = labels[0]
          } else {
            edge.label = '[...]'
          }
        }
        return edge
      }

      return Object.assign(
        edge,
        relation.title !== '' && { label: relation.title },
        relation.color && { color: relation.color },
        relation.line && { line: relation.line },
        relation.head && { head: relation.head },
        relation.tail && { tail: relation.tail }
      )
    })
  }

  protected get elements() {
    return new Set([
      ...this.ctxElements,
      ...this.ctxEdges.flatMap(e => [e.source, e.target])
    ]) as ReadonlySet<Element>
  }

  protected addEdges(edges: ComputeCtx.Edge[]) {
    for (const e of edges) {
      if (e.relations.length === 0) {
        continue
      }
      const existing = this.ctxEdges.find(
        _e => _e.source.id === e.source.id && _e.target.id === e.target.id
      )
      if (existing) {
        existing.relations = uniq([...existing.relations, ...e.relations])
        continue
      }
      this.ctxEdges.push(e)
    }
  }

  protected addElement(...el: Element[]) {
    for (const r of el) {
      this.ctxElements.add(r)
    }
  }

  protected excludeElement(...excludes: Element[]) {
    for (const el of excludes) {
      this.ctxEdges = this.ctxEdges.filter(e => e.source.id !== el.id && e.target.id !== el.id)
      this.ctxElements.delete(el)
    }
  }

  protected excludeRelation(...relations: Relation[]) {
    for (const relation of relations) {
      let edge
      while ((edge = this.ctxEdges.find(e => e.relations.includes(relation)))) {
        if (edge.relations.length === 1) {
          this.ctxEdges.splice(this.ctxEdges.indexOf(edge), 1)
          continue
        }
        edge.relations = edge.relations.filter(r => r !== relation)
      }
    }
  }

  protected reset() {
    this.ctxElements.clear()
    this.ctxEdges = []
  }

  // Filter out edges if there are edges between descendants
  // i.e. remove implicit edges, derived from childs
  protected removeRedundantImplicitEdges() {
    const edges = [...this.ctxEdges]
    this.ctxEdges = edges.filter(e1 => {
      // Keep the edge, if there is only one relation and it is not implicit (has same source and target as edge)
      if (hasAtLeast(e1.relations, 1) && e1.relations.length === 1) {
        const rel = e1.relations[0]
        if (rel.source === e1.source.id && rel.target === e1.target.id) {
          return true
        }
      }
      // Keep the edge, if there is no edge between descendants
      return !edges.some(
        e2 =>
          e1 !== e2 &&
          (e1.source.id !== e2.source.id || e1.target.id !== e2.target.id) &&
          (e1.source.id === e2.source.id || isAncestor(e1.source.id, e2.source.id)) &&
          (e1.target.id === e2.target.id || isAncestor(e1.target.id, e2.target.id))
      )
    })
  }

  protected processPredicates(viewRules: ViewRuleExpression[]): this {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    for (const rule of viewRules) {
      const isInclude = 'include' in rule
      const exprs = rule.include ?? rule.exclude
      for (const expr of exprs) {
        if (Expr.isElementKindExpr(expr) || Expr.isElementTagExpr(expr)) {
          isInclude
            ? includeElementKindOrTag.call(this, expr)
            : excludeElementKindOrTag.call(this, expr)
          continue
        }
        if (Expr.isElementRef(expr)) {
          isInclude ? includeElementRef.call(this, expr) : excludeElementRef.call(this, expr)
          continue
        }
        if (Expr.isWildcard(expr)) {
          isInclude ? includeWildcardRef.call(this, expr) : excludeWildcardRef.call(this, expr)
          continue
        }
        if (Expr.isIncoming(expr)) {
          isInclude ? includeIncomingExpr.call(this, expr) : excludeIncomingExpr.call(this, expr)
          continue
        }
        if (Expr.isOutgoing(expr)) {
          isInclude ? includeOutgoingExpr.call(this, expr) : excludeOutgoingExpr.call(this, expr)
          continue
        }
        if (Expr.isInOut(expr)) {
          isInclude ? includeInOutExpr.call(this, expr) : excludeInOutExpr.call(this, expr)
          continue
        }
        if (Expr.isRelation(expr)) {
          isInclude ? includeRelationExpr.call(this, expr) : excludeRelationExpr.call(this, expr)
          continue
        }
        nonexhaustive(expr)
      }
    }
    return this
  }
}
