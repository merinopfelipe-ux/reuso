// Config de lint-staged — Calculadora de Reúso.
// La entrada '*' con función que IGNORA el argumento `filenames` corre el
// comando UNA sola vez (no una vez por archivo): gitleaks necesita ver el
// diff staged completo, no archivos sueltos, para detectar secretos.
const config = {
  '*': () => 'gitleaks git --staged --no-banner -c .gitleaks.toml',
  // Bloquea el commit si algún .ts/.tsx staged tiene errores de ESLint (ej.
  // variables/imports sin usar) — antes de esto no había nada que los
  // detectara hasta que alguien corriera `npx eslint` a mano.
  '*.{ts,tsx}': (filenames) => `eslint ${filenames.map(f => `"${f}"`).join(' ')}`,
}

export default config
