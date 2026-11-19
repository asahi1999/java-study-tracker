import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { BADGE_DEFINITIONS } from '@/data/badges';
import { FIXED_TARGET_BADGE_IDS } from '@/lib/badges';

/** 削除しようとしている月・ステップ */
export type GroupDeleteTarget = {
  kind: '月' | 'ステップ';
  id: string;
  name: string;
  /** その月・ステップに入っている週の数 */
  weekCount: number;
};

type DeleteGroupDialogProps = {
  target: GroupDeleteTarget | null;
  onConfirm: (target: GroupDeleteTarget) => void;
  onClose: () => void;
};

/** 削除すると獲得できなくなるバッジの名前（初期データの月・ステップだけ） */
function getLostBadgeName(id: string): string | null {
  const badgeId = FIXED_TARGET_BADGE_IDS[id];
  return BADGE_DEFINITIONS.find((badge) => badge.id === badgeId)?.name ?? null;
}

/**
 * 月・ステップの削除の確認。
 * 週が残っているときは削除できないので、確認の代わりに理由とやり方を伝える（M7）
 */
export function DeleteGroupDialog({ target, onConfirm, onClose }: DeleteGroupDialogProps) {
  if (target && target.weekCount > 0) {
    return (
      <Modal
        open
        onClose={onClose}
        title={`この${target.kind}は削除できません`}
        footer={<Button onClick={onClose}>わかりました</Button>}
      >
        <div className="grid gap-2 text-sm leading-relaxed">
          <p>{`「${target.name}」には週が${target.weekCount}件あります。先に、その週の${target.kind}を変えるか、週を削除してください。`}</p>
        </div>
      </Modal>
    );
  }

  const lostBadge = target ? getLostBadgeName(target.id) : null;

  return (
    <ConfirmDialog
      open={target !== null}
      title={`${target?.kind ?? ''}を削除しますか？`}
      confirmLabel="削除する"
      onConfirm={() => target && onConfirm(target)}
      onCancel={onClose}
    >
      {target && <p className="font-bold">{target.name}</p>}
      {lostBadge && (
        <p>{`この${target?.kind ?? ''}を削除すると、バッジ「${lostBadge}」は獲得できなくなります（獲得済みなら消えません）。`}</p>
      )}
      <p className="text-muted">削除すると元に戻せません。</p>
    </ConfirmDialog>
  );
}
