// Distancia de Levenshtein: cuántos cambios de un carácter (insertar, borrar,
// sustituir) hacen falta para convertir a en b. Se usa para detectar
// celulares casi idénticos (típico typo de un dígito de más/menos o
// cambiado) al crear un cliente nuevo, antes de guardarlo — nunca reemplaza
// el índice único real, solo atrapa los casos que SÍ pasarían esa validación
// por ser técnicamente distintos.
export function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + costo
      )
    }
  }
  return dp[m][n]
}
