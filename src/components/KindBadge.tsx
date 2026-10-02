import type { EntryKind } from '../lib/codex'
import { KIND_LABEL } from '../lib/search'

export function KindBadge({ kind }: { kind: EntryKind }) {
  return <span className={`badge badge-${kind}`}>{KIND_LABEL[kind]}</span>
}
