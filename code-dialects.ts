// Code dialect mapping: the TextMate C++ grammar does not know CUDA identifiers,
// so every word it cannot classify is registered here with the role it plays.
//
// Why not at the grammar level: Shiki does not forward TextMate injections, and
// cloning the cpp grammar to patch it breaks as soon as the grammar changes.
// Patching at the token level is the only stable, grammar-version independent way.
// Adding HIP, SYCL or OpenCL later only needs one more entry in `cppDialects`.
import type { ShikiTransformer, ThemedToken } from 'shiki'

/** The role a dialect word plays, which decides the palette colour it borrows. */
export type DialectRole = 'keyword' | 'function' | 'variable'

/** Role -> concrete style; colours come from the palette in build.tsx, never duplicated here. */
export type DialectStyle = { color: string; fontStyle: number }

export const cppDialects = {
  cuda: {
    /** Modifiers in front of a declaration or function, plus storage space qualifiers. */
    keyword: [
      '__global__', '__device__', '__host__', '__forceinline__', '__restrict__',
      '__launch_bounds__', '__managed__', '__shared__', '__constant__'
    ],
    /** Intrinsic functions. */
    function: [
      '__syncthreads', '__syncwarp', '__shfl_down_sync', '__shfl_xor_sync',
      '__expf', '__ldg', 'atomicAdd'
    ],
    /** Intrinsic variables such as thread and block indices. */
    variable: ['threadIdx', 'blockIdx', 'blockDim', 'gridDim', 'warpSize']
  }
  // Kernel launch syntax <<<grid, block>>> is not handled here: it is not an identifier.
} satisfies Record<string, Partial<Record<DialectRole, readonly string[]>>>

export type DialectName = keyof typeof cppDialects

/**
 * Fence name -> the language actually used for highlighting, plus the dialect
 * word list to overlay. Fence names not listed here use themselves as the language.
 * `cpp` also overlays the CUDA list: those words never appear in plain C++, and if
 * they do they really are CUDA macros.
 */
export const codeTargets: Record<string, { language: string; dialect?: DialectName }> = {
  cpp: { language: 'cpp', dialect: 'cuda' },
  cuda: { language: 'cpp', dialect: 'cuda' },
  cu: { language: 'cpp', dialect: 'cuda' },
  ptx: { language: 'asm' },
  sh: { language: 'bash' }
}

/**
 * Turn a word list into a Shiki transformer. It only splits tokens and swaps their
 * style; it never rewrites the source, so the same text inside strings, comments or
 * preprocessor lines keeps its own token and is left alone.
 */
export const createDialectTransformer = (
  dialect: DialectName,
  styles: Record<DialectRole, DialectStyle>
): ShikiTransformer => {
  const roleByWord = new Map<string, DialectRole>()

  for (const [role, words] of Object.entries(cppDialects[dialect]))
    for (const word of words ?? [])
      roleByWord.set(word, role as DialectRole)

  if (roleByWord.size === 0)
    return { name: `dialect-${dialect}` }

  const wordPattern = new RegExp(`\\b(${[...roleByWord.keys()].join('|')})\\b`, 'g')

  return {
    name: `dialect-${dialect}`,
    tokens(tokens: ThemedToken[][]): ThemedToken[][] {
      return tokens.map(line => line.flatMap(token => {
        const pieces: ThemedToken[] = []
        let cursor = 0

        for (const hit of token.content.matchAll(wordPattern)) {
          const start = hit.index ?? 0
          if (start > cursor)
            pieces.push({ ...token, content: token.content.slice(cursor, start) })

          const style = styles[roleByWord.get(hit[0]) ?? 'keyword']
          pieces.push({ ...token, content: hit[0], color: style.color, fontStyle: style.fontStyle })
          cursor = start + hit[0].length
        }

        if (cursor === 0)
          return [token]

        if (cursor < token.content.length)
          pieces.push({ ...token, content: token.content.slice(cursor) })

        return pieces
      }))
    }
  }
}
