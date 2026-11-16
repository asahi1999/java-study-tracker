/** 完成にした週のチェックを変えようとしたときのエラー */
export class ChecklistLockedError extends Error {
  constructor() {
    super('完成にした週のチェックは変更できません。変更するには、完成を取り消してください。');
    this.name = 'ChecklistLockedError';
  }
}

/** チェックが残っている週を完成にしようとしたときのエラー */
export class WeekNotCompletableError extends Error {
  constructor() {
    super('チェックしていない項目が残っているので、完成にできません。');
    this.name = 'WeekNotCompletableError';
  }
}
