/** 週が残っている月・ステップを削除しようとしたときのエラー */
export class HasWeeksError extends Error {
  constructor(target: '月' | 'ステップ') {
    super(`週が残っている${target}は削除できません。先に週を移動するか削除してください。`);
    this.name = 'HasWeeksError';
  }
}
