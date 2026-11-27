// Java のエディタ（CodeMirror 6）。中身は外から渡した最初の値で作り、あとはエディタが持つ（制御しない）。
// 書き換え（最初のコードに戻す）と行への移動は ref から行う
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import {
  editorExtensions,
  type EditorFold,
  type EditorMark,
  initialFoldEffects,
  setMarks,
} from './extensions';

export type { EditorFold, EditorMark } from './extensions';

export type JavaEditorHandle = {
  getValue(): string;
  setValue(code: string): void;
  focusLine(line: number): void;
  focus(): void;
};

type Props = {
  initialValue: string;
  readOnly?: boolean;
  writeLines?: number[];
  folds?: EditorFold[];
  marks?: EditorMark[];
  ariaLabel: string;
  onRun?: () => void;
  onChange?: (code: string, cursorLine: number) => void;
  className?: string;
};

export const JavaEditor = forwardRef<JavaEditorHandle, Props>(function JavaEditor(
  {
    initialValue,
    readOnly = false,
    writeLines = [],
    folds = [],
    marks = [],
    ariaLabel,
    onRun,
    onChange,
    className,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // コールバックは描画のたびに作り直されることがあるので、いつも最新のものを呼ぶ
  const callbacks = useRef({ onRun, onChange });
  useEffect(() => {
    callbacks.current = { onRun, onChange };
  });

  // エディタは最初の1回だけ作る（別の問題に移るときは、呼ぶ側が key を変えて作り直す）
  const initial = useRef({ initialValue, readOnly, writeLines, folds, ariaLabel });
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const opts = initial.current;
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: opts.initialValue,
        extensions: editorExtensions({
          readOnly: opts.readOnly,
          writeLines: opts.writeLines,
          folds: opts.folds,
          ariaLabel: opts.ariaLabel,
          onRun: () => callbacks.current.onRun?.(),
          onChange: (code, line) => callbacks.current.onChange?.(code, line),
        }),
      }),
    });
    const effects = initialFoldEffects(view, opts.folds);
    if (effects.length > 0) view.dispatch({ effects });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setMarks.of(marks) });
  }, [marks]);

  useImperativeHandle(ref, () => ({
    getValue: () => viewRef.current?.state.doc.toString() ?? '',
    setValue(code) {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
      const effects = initialFoldEffects(view, initial.current.folds);
      if (effects.length > 0) view.dispatch({ effects });
    },
    focusLine(line) {
      const view = viewRef.current;
      if (!view) return;
      const n = Math.min(Math.max(line, 1), view.state.doc.lines);
      const pos = view.state.doc.line(n).from;
      view.dispatch({
        selection: EditorSelection.cursor(pos),
        effects: EditorView.scrollIntoView(pos, { y: 'center' }),
      });
      view.focus();
    },
    focus: () => viewRef.current?.focus(),
  }));

  return <div ref={hostRef} className={`on-well h-full ${className ?? ''}`} />;
});
