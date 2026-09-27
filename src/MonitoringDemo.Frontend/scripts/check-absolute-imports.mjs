import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const sourceRoot = path.resolve('src')
const sourceFiles = await findSourceFiles(sourceRoot)
const relativeImportPattern = /(?:\bfrom\s*|\bimport\s*\(|\bimport\s*)['"](\.\.?\/[^'"]*)['"]/g
const violations = []

for (const file of sourceFiles) {
  const content = await readFile(file, 'utf8')

  for (const match of content.matchAll(relativeImportPattern)) {
    const line = content.slice(0, match.index).split('\n').length
    violations.push(`${path.relative(process.cwd(), file)}:${line} ${match[1]}`)
  }
}

if (violations.length > 0) {
  console.error('Relative frontend imports are forbidden. Use the @/ alias:')
  console.error(violations.join('\n'))
  process.exitCode = 1
}

async function findSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory()
      ? findSourceFiles(entryPath)
      : /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : []
  }))

  return files.flat()
}
