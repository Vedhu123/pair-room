const SEEDS = {
  javascript: `// Pair Room
// Two cursors, one document. Try typing at the same time.

function greet(name) {
  return \`Hello, \${name}\`
}

console.log(greet("pair"))
`,
  python: `# Pair Room
# Two cursors, one document. Try typing at the same time.

def greet(name):
    return f"Hello, {name}"

print(greet("pair"))
`
}

export function seedDoc(ydoc, language) {
  const text = ydoc.getText('codemirror')
  const meta = ydoc.getMap('meta')
  const nextLanguage = language === 'python' ? 'python' : 'javascript'
  ydoc.transact(() => {
    if (text.length === 0) text.insert(0, SEEDS[nextLanguage])
    if (!meta.has('language')) meta.set('language', nextLanguage)
  })
}
