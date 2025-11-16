import { createServer } from 'vite'

async function inspect() {
  const server = await createServer({
    root: process.cwd(),
    logLevel: 'error',
  })


  try {
    const files = ['/src/game/save.ts', '/src/game/engine.ts', '/src/game/config.ts', '/tests/migrate.test.ts', '/tests/offline.test.ts']
    for (const f of files) {
      console.log(`\n--- TRANSFORM (SSR): ${f} ---\n`)
      // Request SSR transform output to capture server-side transformed code
      const res = await server.transformRequest(f, { ssr: true })
      if (!res) {
        console.log('<no transform result>')
        continue
      }
      if (typeof res === 'string') {
        console.log(res)
      } else if (res.code) {
        console.log(res.code)
      } else {
        console.log(JSON.stringify(res))
      }
      console.log(`\n--- END: ${f} ---\n`)
    }
  } catch (err) {
    console.error('Transform error:', err)
  } finally {
    await server.close()
  }
}

inspect()
