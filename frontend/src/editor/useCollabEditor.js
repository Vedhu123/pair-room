import { useEffect, useRef, useState } from 'react'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { EditorState, Compartment } from '@codemirror/state'
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection
} from '@codemirror/view'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { yCollab } from 'y-codemirror.next'
import { collabSocketBase } from '../services/api'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { inkHighlight, inkTheme } from './theme'

const languageConf = new Compartment()
const palette = ['#ef6b32', '#3c9e8f', '#d4a017', '#6b8afd', '#d46b9a', '#7d9a4e']

function colorFor(id) {
  let index = 0
  for (const char of id) index = (index + char.charCodeAt(0)) % palette.length
  return palette[index]
}

function languageExtension(language) {
  return language === 'python' ? python() : javascript()
}

export function useCollabEditor({ roomId, user, initialLanguage }) {
  const parentRef = useRef(null)
  const metaRef = useRef(null)
  const [status, setStatus] = useState('connecting')
  const [ready, setReady] = useState(false)
  const [peers, setPeers] = useState([])
  const [language, setLanguageState] = useState(initialLanguage || 'javascript')

  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return undefined
    let active = true

    const ydoc = new Y.Doc()
    const meta = ydoc.getMap('meta')
    metaRef.current = meta
    const ytext = ydoc.getText('codemirror')
    const provider = new WebsocketProvider(`${collabSocketBase()}/yjs`, roomId, ydoc)
    const color = colorFor(user.id)

    provider.awareness.setLocalStateField('user', {
      name: user.name,
      color,
      colorLight: `${color}33`
    })

    const publishPeers = () => {
      if (!active) return
      const next = []
      provider.awareness.getStates().forEach((state, clientId) => {
        if (!state.user) return
        next.push({
          clientId,
          name: state.user.name,
          color: state.user.color,
          self: clientId === provider.awareness.clientID
        })
      })
      setPeers(next)
    }

    provider.on('status', (event) => {
      if (active) setStatus(event.status)
    })
    provider.on('sync', (isSynced) => {
      if (active && isSynced) {
        applyLanguage()
        setReady(true)
      }
    })
    provider.awareness.on('change', publishPeers)

    const view = new EditorView({
      parent,
      state: EditorState.create({
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          foldGutter(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          EditorState.tabSize.of(2),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          inkHighlight,
          inkTheme,
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...foldKeymap, indentWithTab]),
          languageConf.of(languageExtension(initialLanguage)),
          yCollab(ytext, provider.awareness),
          EditorView.contentAttributes.of({
            spellcheck: 'false',
            'aria-label': 'Shared code editor'
          })
        ]
      })
    })

    function applyLanguage() {
      if (!active) return
      const next = meta.get('language') || initialLanguage || 'javascript'
      setLanguageState(next)
      view.dispatch({ effects: languageConf.reconfigure(languageExtension(next)) })
    }

    meta.observe(applyLanguage)
    publishPeers()

    return () => {
      active = false
      provider.destroy()
      view.destroy()
      ydoc.destroy()
      metaRef.current = null
    }
  }, [roomId, user.id, user.name, initialLanguage])

  function setLanguage(next) {
    metaRef.current?.set('language', next)
    setLanguageState(next)
  }

  return { parentRef, status, peers, language, setLanguage, ready }
}
