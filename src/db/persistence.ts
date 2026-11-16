/**
 * ブラウザに「このサイトのデータを自動で消さないでほしい」と依頼する。
 * Safari は7日間使われなかったサイトのデータを消すことがあり、
 * 年末年始などの休止期間で学習記録が失われるのを防ぎたいため。
 * 許可するかどうかはブラウザ次第なので、失敗してもアプリは止めない
 * @returns 永続化が認められたら true
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;

  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
