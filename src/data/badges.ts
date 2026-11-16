/** バッジの定義。獲得したかどうかは別に保存する（EarnedBadge） */
export type BadgeDefinition = {
  id: string;
  name: string;
  /** 獲得の条件（未獲得のバッジにも表示する） */
  condition: string;
};

export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  { id: 'first-log', name: 'はじめの一歩', condition: '初めて学習ログを記録' },
  { id: 'first-done', name: '初完成', condition: '初めて週を完成' },
  { id: 'streak-3', name: '三日坊主卒業', condition: '3日連続で学習' },
  { id: 'streak-7', name: '1週間継続', condition: '7日連続で学習' },
  { id: 'streak-30', name: '習慣化マスター', condition: '30日連続で学習' },
  { id: 'hours-10', name: '10時間突破', condition: '累計10時間' },
  { id: 'hours-50', name: '50時間突破', condition: '累計50時間' },
  { id: 'hours-100', name: '100時間突破', condition: '累計100時間' },
  { id: 'month-1', name: '1ヶ月目クリア', condition: '1ヶ月目の週をすべて完成' },
  { id: 'month-2', name: '2ヶ月目クリア', condition: '2ヶ月目の週をすべて完成' },
  { id: 'oop', name: 'オブジェクト指向入門', condition: 'ステップ④を完成' },
  { id: 'sql', name: 'DBデビュー', condition: 'ステップ⑤を完成' },
  { id: 'spring', name: 'Spring Bootデビュー', condition: 'ステップ⑥を完成' },
  { id: 'repo-5', name: 'GitHub常連', condition: 'GitHub URLを5つ以上登録' },
  { id: 'on-time', name: '予定どおり', condition: '遅れなしで1ヶ月分を完成' },
  { id: 'complete', name: 'ロードマップ完走', condition: 'すべての週を完成' },
];
