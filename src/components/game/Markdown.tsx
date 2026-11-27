// 教材の本文（Markdown）。生の HTML は描かない（設計書 6-3）
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`prose-jq ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
}
