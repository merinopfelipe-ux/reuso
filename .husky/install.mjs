// Evita que el build de Vercel (NODE_ENV=production) o cualquier CI falle
// intentando instalar git hooks donde no hacen falta — los hooks de husky
// solo tienen sentido en la máquina de un desarrollador con .git local.
if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
  process.exit(0)
}
const husky = (await import('husky')).default
console.log(husky())
