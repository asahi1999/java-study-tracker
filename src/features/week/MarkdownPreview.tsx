import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Markdown で書いたメモを、整形して表示する */
export function MarkdownPreview({ source }: { source: string }) {
  if (source.trim() === '') {
    return <p className="text-sm text-muted">メモはまだありません。</p>;
  }

  return (
    <div className="markdown">
      <Markdown
        // GFM を有効にして、表・チェックボックスつきのリスト・打ち消し線を使えるようにする
        remarkPlugins={[remarkGfm]}
        components={{
          // メモの中のリンクは別のタブで開く。アプリの画面から離れて、入力中の内容を失わないようにするため
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {source}
      </Markdown>
    </div>
  );
}
