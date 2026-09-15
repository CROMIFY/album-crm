<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 🔀 Flujo de Git
- **Nunca hagas commit ni push directo a `master`**. Trabaja siempre en `develop` (o una rama propia partiendo de `develop`).
- `master` solo se actualiza mediante merge/PR desde `develop` — es la rama de despliegue: cada push a `master` dispara el deploy a producción (`deploy.yml` → Vercel).
- Antes de tocar nada, comprueba en qué rama estás (`git branch --show-current`) y cámbiate a `develop` si no lo estás.
