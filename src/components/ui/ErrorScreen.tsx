import { Button } from './Button';

type ErrorScreenProps = {
  /** ブラウザが返したエラーの内容。原因を調べる手がかりとして表示する */
  message: string;
};

/** データベースを開けず、アプリを始められないときに表示する画面 */
export function ErrorScreen({ message }: ErrorScreenProps) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <div role="alert" className="w-full max-w-md rounded-md border border-line bg-surface p-6">
        <h1 className="text-lg font-bold">データを読み込めませんでした</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          このアプリは学習の記録をブラウザの中に保存します。プライベートブラウズでは保存できないことがあるので、通常のウィンドウで開き直してください。
        </p>
        <p className="mt-3 break-words rounded bg-status-red-bg px-3 py-2 text-sm text-status-red-fg">
          {message}
        </p>
        <div className="mt-5">
          <Button variant="primary" onClick={() => window.location.reload()}>
            再読み込み
          </Button>
        </div>
      </div>
    </div>
  );
}
