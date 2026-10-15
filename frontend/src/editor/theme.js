import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { EditorView } from '@codemirror/view'

export const inkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#161513',
    color: '#f4f0e8',
    height: '100%'
  },
  '.cm-scroller': {
    fontFamily: '"IBM Plex Mono", Consolas, monospace',
    fontSize: '14px',
    lineHeight: '1.55'
  },
  '.cm-content': {
    caretColor: '#ef6b32',
    padding: '16px 0'
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#ef6b32' },
  '.cm-gutters': {
    backgroundColor: '#161513',
    color: '#6f695f',
    border: 'none'
  },
  '.cm-activeLine': { backgroundColor: '#221f1b' },
  '.cm-activeLineGutter': { backgroundColor: '#221f1b' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: '#ef6b3233'
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-ySelectionInfo': {
    fontFamily: 'Outfit, "Segoe UI", sans-serif',
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: '2px'
  }
}, { dark: true })

export const inkHighlight = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword, color: '#ef6b32' },
  { tag: tags.string, color: '#e2b15a' },
  { tag: tags.comment, color: '#7d776c', fontStyle: 'italic' },
  { tag: tags.number, color: '#7dbe86' },
  { tag: tags.bool, color: '#7dbe86' },
  { tag: tags.operator, color: '#a69e92' },
  { tag: tags.punctuation, color: '#a69e92' },
  { tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: '#f4f0e8' },
  { tag: [tags.className, tags.propertyName], color: '#f0d2b4' }
]))
