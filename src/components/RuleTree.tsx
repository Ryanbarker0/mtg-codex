import type { RuleNode } from '../lib/codex'
import { RuleText } from './RuleText'

interface Props {
  node: RuleNode
  onOpen: (id: string) => void
  selfId: string
  depth?: number
}

/** Renders a rule section verbatim: its title, each numbered or lettered rule, and examples. */
export function RuleTree({ node, onOpen, selfId, depth = 0 }: Props) {
  return (
    <div className={`rule depth-${Math.min(depth, 2)}`}>
      {node.title && (
        <div className="rule-title">
          <span className="rule-number">{node.number}.</span> {node.title}
        </div>
      )}
      {node.text && (
        <p className="rule-text">
          <span className="rule-number">{node.number}</span>{' '}
          <RuleText text={node.text} onOpen={onOpen} selfId={selfId} />
        </p>
      )}
      {node.examples?.map((example, i) => (
        <p key={i} className="rule-example">
          <span className="rule-example-label">Example</span>{' '}
          <RuleText text={example} onOpen={onOpen} selfId={selfId} />
        </p>
      ))}
      {node.children.map((child) => (
        <RuleTree
          key={child.number}
          node={child}
          onOpen={onOpen}
          selfId={selfId}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}
