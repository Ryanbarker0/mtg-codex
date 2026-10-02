/** Names where a block of text came from. Every block in an entry carries one. */
export function SourceTag({ children, href }: { children: string; href?: string }) {
  if (href) {
    return (
      <a className="source" href={href} target="_blank" rel="noreferrer">
        {children} ↗
      </a>
    )
  }
  return <span className="source">{children}</span>
}
