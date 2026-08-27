# Pilar 5: Seguridad Nativa y Prevención

Esta regla asegura que el sistema sea invulnerable a fugas y ataques utilizando exclusivamente herramientas gratuitas, de código abierto o integradas nativamente en la infraestructura base, manteniendo la Frugalidad como directriz suprema.

- **Identidad y Acceso (Auth):** Prohibido proponer servicios costosos como Auth0 o Okta. Toda la autenticación y autorización debe hacerse exclusivamente con Supabase Auth y Row Level Security (RLS) directo en la base de datos de PostgreSQL.
- **Escaneo de Vulnerabilidades:** Prohibido integrar herramientas de pago como Snyk. Se usará exclusivamente GitHub Dependabot y `npm audit` para detectar brechas en paquetes de dependencias.
- **Prevención de Fugas en Código Local:** Obligatorio el uso de `gitleaks` (Open Source) configurado como un *pre-commit hook* mediante Husky. Esto evita, localmente y sin costo, que un desarrollador suba claves o contraseñas a los repositorios por error humano.
- **Gestión de Secretos:** Prohibido el uso de gestores de pago como AWS Secrets Manager o HashiCorp Vault. Las variables sensibles solo vivirán inyectadas en las variables de entorno (Environment Variables) nativas de Vercel.
