import { ChevronDown, Pause, Play, Square, Timer } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WeekSelect } from '@/features/logs/WeekSelect';
import { TimerFinishModal } from '@/features/timer/TimerFinishModal';
import { useNow } from '@/hooks/useNow';
import { useRoadmapData } from '@/hooks/useRoadmapData';
import { useToday } from '@/hooks/useToday';
import { formatElapsed, getElapsedMs, pickDefaultWeekId, type TimerStatus } from '@/lib/timer';
import { buildWeekViews } from '@/lib/weekView';
import { useTimerStore } from '@/stores/timerStore';

const APP_TITLE = 'Java Study Tracker';

const STATUS_LABELS: Record<TimerStatus, string> = {
  idle: '停止中',
  running: '計測中',
  paused: '一時停止中',
};

// 濃紺の板の上に置くボタン（輪郭だけ）。共通の Button は白地向けの色なので、板の上では使えない
const BOARD_BUTTON =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded border-[1.5px] border-board-muted px-4 text-sm font-bold leading-none text-board-ink transition-colors hover:bg-white/10';
const BOARD_SELECT =
  'mt-1 block h-10 w-full rounded border-[1.5px] border-board-line bg-board px-2 text-sm text-board-ink';

/**
 * 学習タイマー。全画面の右下に小さく出し、押すと操作パネルを開く。
 * 駅の発車案内のように、濃紺の板に黄色の数字で時間を出している
 */
export function TimerWidget() {
  const panelId = useId();
  const selectId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  const data = useRoadmapData();
  const today = useToday();
  const timer = useTimerStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  // 始める前に選んだ週。undefined は、まだ選んでいない（初期値を使う）
  const [chosenWeekId, setChosenWeekId] = useState<string | null | undefined>(undefined);

  const now = useNow(timer.status === 'running');
  const elapsed = formatElapsed(getElapsedMs(timer, now));

  const weeks = useMemo(() => data?.weeks ?? [], [data]);
  const defaultWeekId = useMemo(
    () =>
      data
        ? pickDefaultWeekId(buildWeekViews(data.weeks, data.skills, data.settings, today))
        : null,
    [data, today],
  );
  const wantedWeekId =
    timer.status !== 'idle'
      ? timer.weekId
      : chosenWeekId === undefined
        ? defaultWeekId
        : chosenWeekId;
  // 選んでいた週が削除されていたら、「週の指定なし」として扱う
  const weekId = weeks.some((week) => week.id === wantedWeekId) ? wantedWeekId : null;

  // 計測中は、ほかのタブを見ていても経過時間が分かるように、タブのタイトルに出す
  useEffect(() => {
    document.title = timer.status === 'running' ? `${elapsed} 計測中 | ${APP_TITLE}` : APP_TITLE;
  }, [timer.status, elapsed]);
  useEffect(
    () => () => {
      document.title = APP_TITLE;
    },
    [],
  );

  const closePanel = () => {
    setPanelOpen(false);
    toggleRef.current?.focus();
  };

  const handleWeekChange = (value: string) => {
    const next = value === '' ? null : value;
    if (timer.status === 'idle') setChosenWeekId(next);
    else timer.setWeekId(next);
  };

  const handleFinish = () => {
    // 入力している間に時間が進まないよう、止めてからダイアログを開く
    timer.pause();
    // パネルを開いたままだと、保存したあとも画面の右下をふさぐので閉じておく
    setPanelOpen(false);
    setFinishOpen(true);
  };

  const handleDiscard = () => {
    timer.reset();
    setDiscardOpen(false);
    setPanelOpen(false);
  };

  return (
    <>
      <div className="on-board fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-3 z-40 [color-scheme:dark] md:bottom-5 md:right-6">
        {panelOpen && (
          <section
            id={panelId}
            aria-label="学習タイマー"
            onKeyDown={(event) => {
              if (event.key === 'Escape') closePanel();
            }}
            className="absolute bottom-full right-0 mb-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-md border border-board-line bg-board p-4 text-board-ink shadow-2xl"
          >
            <p className="text-[13px] font-bold leading-none text-board-muted">
              {STATUS_LABELS[timer.status]}
            </p>
            <p
              role="timer"
              aria-label="経過時間"
              className={`mt-2 font-num text-5xl font-bold leading-none ${
                timer.status === 'running' ? 'text-accent' : ''
              }`}
            >
              {elapsed}
            </p>

            <label htmlFor={selectId} className="mt-4 block text-[13px] font-bold">
              学習する週
            </label>
            <WeekSelect
              id={selectId}
              value={weekId ?? ''}
              onChange={handleWeekChange}
              weeks={weeks}
              className={BOARD_SELECT}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {timer.status === 'idle' && (
                <Button variant="primary" className="flex-1" onClick={() => timer.start(weekId)}>
                  <Play aria-hidden className="size-4" />
                  開始
                </Button>
              )}
              {timer.status === 'running' && (
                <button
                  type="button"
                  className={`${BOARD_BUTTON} whitespace-nowrap`}
                  onClick={() => timer.pause()}
                >
                  <Pause aria-hidden className="size-4" />
                  一時停止
                </button>
              )}
              {timer.status === 'paused' && (
                <button
                  type="button"
                  className={`${BOARD_BUTTON} whitespace-nowrap`}
                  onClick={() => timer.resume()}
                >
                  <Play aria-hidden className="size-4" />
                  再開
                </button>
              )}
              {timer.status !== 'idle' && (
                <Button
                  variant="primary"
                  className="flex-1 whitespace-nowrap"
                  onClick={handleFinish}
                >
                  <Square aria-hidden className="size-3.5" />
                  終了して記録
                </Button>
              )}
            </div>
            {timer.status !== 'idle' && (
              <button
                type="button"
                onClick={() => setDiscardOpen(true)}
                className="mt-3 rounded text-[13px] text-board-muted underline underline-offset-2 hover:text-board-ink"
              >
                記録せずに破棄
              </button>
            )}
          </section>
        )}

        <button
          ref={toggleRef}
          type="button"
          aria-expanded={panelOpen}
          aria-controls={panelOpen ? panelId : undefined}
          onClick={() => setPanelOpen((open) => !open)}
          className="ml-auto flex h-12 items-center gap-2 rounded-full border border-board-line bg-board pl-4 pr-3 text-board-ink shadow-lg transition-colors hover:bg-board/90"
        >
          <Timer
            aria-hidden
            className={`size-5 ${timer.status === 'running' ? 'text-accent' : 'text-board-muted'}`}
          />
          <span className="sr-only">学習タイマー</span>
          {timer.status === 'idle' ? (
            <span aria-hidden className="text-sm font-bold">
              タイマー
            </span>
          ) : (
            <>
              <span className="font-num text-xl font-bold leading-none">{elapsed}</span>
              {timer.status === 'paused' && (
                <span className="text-xs text-board-muted">一時停止中</span>
              )}
            </>
          )}
          <ChevronDown
            aria-hidden
            className={`size-4 text-board-muted transition-transform ${panelOpen ? '' : 'rotate-180'}`}
          />
        </button>
      </div>

      {/* ダイアログは白地なので、濃紺の板の外に置く（板の中だと、フォーカスの枠や入力欄が板用の色になる） */}
      <TimerFinishModal
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        weeks={weeks}
        today={today}
      />

      <ConfirmDialog
        open={discardOpen}
        title="計測を破棄しますか？"
        confirmLabel="破棄する"
        onConfirm={handleDiscard}
        onCancel={() => setDiscardOpen(false)}
      >
        <p>ここまで計測した {elapsed} は、学習ログに記録されません。元に戻せません。</p>
      </ConfirmDialog>
    </>
  );
}
