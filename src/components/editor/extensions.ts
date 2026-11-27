// CodeMirror 6 の設定（05-visual-design.md 7-4・7-7、設計書 15-1 の注）。
// 地は well（テーマに関係なく暗い）。折りたたみは教材の //@fold の範囲だけで行い、構文木には頼らない
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { java, javaLanguage } from '@codemirror/lang-java';
import {
  codeFolding,
  foldEffect,
  HighlightStyle,
  LanguageSupport,
  syntaxHighlighting,
} from '@codemirror/language';
import { type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  keymap,
  lineNumbers,
  WidgetType,
} from '@codemirror/view';
import { styleTags, tags } from '@lezer/highlight';

export type EditorFold = { from: number; to: number; label: string };
export type EditorMark = { line: number; column: number; message: string };

/** Java 25 の record・sealed・permits に色を足す（04-spikes.md 4章） */
const javaWithNewKeywords = new LanguageSupport(
  javaLanguage.configure({
    props: [styleTags({ 'record sealed permits': tags.definitionKeyword })],
  }),
  java().support,
);

const highlight = HighlightStyle.define([
  {
    tag: [tags.keyword, tags.modifier, tags.definitionKeyword, tags.controlKeyword],
    color: '#c9b5ff',
  },
  { tag: [tags.typeName, tags.className, tags.standard(tags.typeName)], color: '#86c6ea' },
  { tag: [tags.string, tags.special(tags.string)], color: '#a3dcb6' },
  { tag: [tags.number, tags.character, tags.bool, tags.null], color: '#f7c47f' },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: '#8e88a3',
    fontStyle: 'italic',
  },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: '#f2e9d8',
    fontWeight: '500',
  },
  { tag: [tags.punctuation, tags.operator, tags.bracket, tags.separator], color: '#a9a2bb' },
]);

const theme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'rgb(var(--well))',
      color: 'rgb(var(--well-ink))',
      fontSize: '14px',
      height: '100%',
    },
    '.cm-scroller': {
      fontFamily: '"IBM Plex Mono", "SF Mono", Menlo, monospace',
      lineHeight: '22px',
      fontVariantLigatures: 'none',
    },
    '.cm-content': { padding: '8px 0', caretColor: 'rgb(var(--torch-hi))' },
    '.cm-line': { padding: '0 16px 0 18px' },
    '.cm-gutters': {
      backgroundColor: 'rgb(var(--well))',
      color: 'rgb(var(--well-faint))',
      border: 'none',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '34px',
      paddingRight: '0',
      textAlign: 'right',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeft: '2px solid rgb(var(--torch-hi))' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgb(var(--torch-hi) / 0.2) !important',
    },
    '&.cm-focused': { outline: 'none', boxShadow: 'inset 0 0 0 2px rgb(var(--torch-hi))' },
    '.cm-write-line': {
      backgroundColor: 'rgb(var(--torch) / 0.07)',
      boxShadow: 'inset 3px 0 0 rgb(var(--torch))',
    },
    '.cm-write-head': {
      color: 'rgb(var(--torch))',
      fontFamily: '"BIZ UDPGothic", sans-serif',
      fontSize: '13px',
      padding: '4px 18px 2px',
    },
    '.cm-error-line': {
      backgroundColor: 'rgb(240 143 112 / 0.1)',
      boxShadow: 'inset 3px 0 0 #f08f70',
    },
    '.cm-error-mark': {
      textDecoration: 'underline wavy #f08f70',
      textDecorationThickness: '1.5px',
      textUnderlineOffset: '3px',
    },
    '.cm-error-note': {
      backgroundColor: 'rgb(240 143 112 / 0.1)',
      color: 'rgb(var(--well-ink))',
      fontFamily: '"BIZ UDPGothic", sans-serif',
      fontSize: '13px',
      padding: '4px 18px',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
    },
    '.cm-error-note b': { color: '#f08f70', fontWeight: '700', marginRight: '8px' },
    '.cm-foldPlaceholder': {
      display: 'inline-block',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
      backgroundColor: 'rgb(36 33 50)',
      color: 'rgb(var(--well-dim))',
      border: 'none',
      borderLeft: '2px dotted rgb(var(--well-faint))',
      fontFamily: '"BIZ UDPGothic", sans-serif',
      fontSize: '12px',
      lineHeight: '22px',
      padding: '0 10px',
      margin: '0',
      cursor: 'pointer',
    },
  },
  { dark: true },
);

class WriteHeadWidget extends WidgetType {
  readonly line: number;
  constructor(line: number) {
    super();
    this.line = line;
  }
  eq(other: WriteHeadWidget) {
    return other.line === this.line;
  }
  toDOM() {
    const el = document.createElement('div');
    el.className = 'cm-write-head';
    el.textContent = `▼ 書くのはここ（${this.line}行目）`;
    return el;
  }
}

class ErrorNoteWidget extends WidgetType {
  readonly mark: EditorMark;
  constructor(mark: EditorMark) {
    super();
    this.mark = mark;
  }
  eq(other: ErrorNoteWidget) {
    return (
      other.mark.line === this.mark.line &&
      other.mark.column === this.mark.column &&
      other.mark.message === this.mark.message
    );
  }
  toDOM() {
    const el = document.createElement('div');
    el.className = 'cm-error-note';
    const b = document.createElement('b');
    b.textContent = `${this.mark.line}行目`;
    el.append(b, document.createTextNode(this.mark.message));
    return el;
  }
}

/** 「書くのはここ」の行（教材の //@write）。中身を変えても行の位置に合わせて動く */
function writeLinesField(lines: number[]): Extension {
  return StateField.define<DecorationSet>({
    create(state) {
      const builder = new RangeSetBuilder<Decoration>();
      const sorted = [...lines].sort((a, b) => a - b).filter((n) => n >= 1 && n <= state.doc.lines);
      sorted.forEach((n, i) => {
        const line = state.doc.line(n);
        if (i === 0) {
          builder.add(
            line.from,
            line.from,
            Decoration.widget({ widget: new WriteHeadWidget(n), block: true, side: -1 }),
          );
        }
        builder.add(line.from, line.from, Decoration.line({ class: 'cm-write-line' }));
      });
      return builder.finish();
    },
    update(value, tr) {
      return value.map(tr.changes);
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}

export const setMarks = StateEffect.define<EditorMark[]>();

/** コンパイルエラーの印（行の地・波線・行の下の1行の説明）。中身を変えたら消す */
const marksField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const e of tr.effects) {
      if (!e.is(setMarks)) continue;
      const builder = new RangeSetBuilder<Decoration>();
      const doc = tr.state.doc;
      const byLine = new Map<number, EditorMark>();
      for (const m of e.value)
        if (m.line >= 1 && m.line <= doc.lines && !byLine.has(m.line)) byLine.set(m.line, m);
      for (const n of [...byLine.keys()].sort((a, b) => a - b)) {
        const mark = byLine.get(n) as EditorMark;
        const line = doc.line(n);
        builder.add(line.from, line.from, Decoration.line({ class: 'cm-error-line' }));
        const start = Math.min(line.from + Math.max(mark.column - 1, 0), line.to);
        const word = /^[\w$]+/.exec(doc.sliceString(start, line.to));
        const end = Math.min(start + Math.max(word?.[0].length ?? 1, 1), line.to);
        if (end > start) builder.add(start, end, Decoration.mark({ class: 'cm-error-mark' }));
        builder.add(
          line.to,
          line.to,
          Decoration.widget({ widget: new ErrorNoteWidget(mark), block: true, side: 1 }),
        );
      }
      return builder.finish();
    }
    return tr.docChanged ? Decoration.none : value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/** 折りたたみの説明（「13〜30行：迷路を…（読むだけ）」）。範囲の頭の位置 → 説明 */
function foldingExtension(folds: EditorFold[]): Extension {
  return codeFolding({
    preparePlaceholder: (state, range) => {
      const from = state.doc.lineAt(range.from).number;
      const to = state.doc.lineAt(range.to).number;
      const fold = folds.find((f) => f.from === from);
      const label = fold?.label ?? '折りたたみ';
      return `${from}〜${to}行：${label.endsWith('（読むだけ）') ? label : `${label}（読むだけ）`}`;
    },
    placeholderDOM: (_view, onclick, prepared: string) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'cm-foldPlaceholder';
      el.textContent = `▸ ${prepared}`;
      el.title = '押すと開きます';
      el.setAttribute('aria-label', `${prepared}。押すと開きます`);
      el.addEventListener('click', onclick);
      return el;
    },
  });
}

/** 最初に畳む範囲（行の頭から終わりの行の末尾まで） */
export function initialFoldEffects(view: EditorView, folds: EditorFold[]): StateEffect<unknown>[] {
  const doc = view.state.doc;
  return folds
    .filter((f) => f.from >= 1 && f.to <= doc.lines && f.from <= f.to)
    .map((f) => foldEffect.of({ from: doc.line(f.from).from, to: doc.line(f.to).to }));
}

export type EditorOptions = {
  readOnly: boolean;
  writeLines: number[];
  folds: EditorFold[];
  ariaLabel: string;
  onRun?: () => void;
  onChange?: (code: string, cursorLine: number) => void;
};

export function editorExtensions(options: EditorOptions): Extension[] {
  const runKey = options.onRun
    ? [
        {
          key: 'Mod-Enter',
          preventDefault: true,
          run: () => {
            options.onRun?.();
            return true;
          },
        },
      ]
    : [];
  return [
    lineNumbers(),
    history(),
    drawSelection(),
    // Esc のあと Tab でエディタから出られる（N-A11Y-1。indentWithTab の決まり）
    keymap.of([...runKey, indentWithTab, ...defaultKeymap, ...historyKeymap]),
    javaWithNewKeywords,
    syntaxHighlighting(highlight),
    theme,
    writeLinesField(options.writeLines),
    marksField,
    foldingExtension(options.folds),
    EditorView.contentAttributes.of({ 'aria-label': options.ariaLabel }),
    ...(options.readOnly
      ? [
          EditorView.editable.of(false),
          EditorView.contentAttributes.of({ 'aria-readonly': 'true' }),
        ]
      : []),
    EditorView.updateListener.of((u) => {
      if (!u.docChanged || !options.onChange) return;
      options.onChange(
        u.state.doc.toString(),
        u.state.doc.lineAt(u.state.selection.main.head).number,
      );
    }),
  ];
}
