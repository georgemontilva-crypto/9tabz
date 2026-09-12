# Product Authentication

Sitio de verificación de autenticidad de producto. Dos páginas públicas y un panel
de administración:

- `/` — **Verify Your Code**: el cliente escribe el código de la etiqueta rascable.
- `/lab-reports` — **Lab Reports**: certificados de análisis (PDF) agrupados por producto.
- `/admin` — panel: códigos, productos, reportes, logs y cuentas de admin.

Marca: **9Tabz** — negro, amarillo (`#ffe81f`) y blanco, sin degradados.

Base clonada de `georgemontilva-crypto/beri-disposable`.

---

## Stack

React 19 + Vite + wouter · tRPC 11 + Express · Drizzle ORM + MySQL · Cloudflare R2 ·
Tailwind 4 · desplegado en Railway.

---

## Cómo funciona la verificación

Cada código puede consultarse un número limitado de veces (**3 por defecto**).

| Situación | Lo que ve el cliente | Lo que se guarda en el log |
|---|---|---|
| Código válido, 1ª consulta | Auténtico | `valid` |
| Código válido, 2ª y 3ª | Auténtico + aviso "Previously verified" con el conteo | `valid` |
| Código válido, 4ª en adelante | **Código no válido** | `limit_reached` |
| Código desactivado por el admin | **Código no válido** | `disabled` |
| Código que no existe | **Código no válido** | `not_found` |

Las tres formas de fallo se ven **idénticas** para el público, a propósito: decirle a
alguien que está probando etiquetas copiadas "este código es real pero está agotado"
le confirma cuál vale la pena reimprimir. La distinción sí queda en el log, donde es
útil y no es visible para quien prueba códigos.

### Por qué el contador es un solo UPDATE

El incremento vive en una única sentencia condicional (`db.consumeVerification`):

```sql
UPDATE auth_codes
   SET verificationCount = verificationCount + 1, ...
 WHERE id = ? AND disabled = false AND verificationCount < maxVerifications
```

Si dos personas consultan el mismo código en el mismo instante, con un
leer-y-después-escribir ambas leerían `verificationCount = 2`, ambas verían margen
bajo el límite de 3, y ambas escribirían 3: cuatro consultas exitosas en un código
que permite tres. Dejando que MySQL evalúe la guarda y el incremento en una sola
sentencia, el `UPDATE` que llega segundo no coincide con ninguna fila y se reporta
como agotado.

---

## Variables de entorno

| Variable | Para qué | Obligatoria |
|---|---|---|
| `DATABASE_URL` | MySQL. En Railway va con la referencia `${{MySQL.MYSQL_URL}}` | Sí |
| `JWT_SECRET` | Firma de la sesión del admin | Sí |
| `ADMIN_SETUP_TOKEN` | Secreto para crear el **primer** admin. Ver abajo | Sí, al inicio |
| `R2_ACCOUNT_ID` | Cloudflare R2 | Para subir PDF |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 | Para subir PDF |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | Para subir PDF |
| `R2_BUCKET` | Nombre del bucket | Para subir PDF |
| `R2_PUBLIC_URL` | URL pública del bucket, sin barra final | Para subir PDF |
| `PORT` | Lo inyecta Railway | No |

### Sobre `ADMIN_SETUP_TOKEN`

El endpoint de creación del primer admin solo se ofrece cuando la tabla `admin_users`
está vacía **y** esta variable existe. Sin ella, cualquier visitante anónimo podría
reclamar el panel durante toda la ventana entre que arranca el contenedor y que
alguien se da cuenta.

1. Pon la variable en Railway con un valor largo y aleatorio.
2. Entra a `/admin/login` y crea tu cuenta.
3. **Borra la variable de Railway.**

Si `R2_PUBLIC_URL` cambia después de haber subido archivos, los enlaces ya guardados
se rompen: las URLs se guardan completas en la base de datos. Conecta el dominio
propio del bucket **antes** de subir los reportes de producción.

---

## Base de datos

Las migraciones se aplican solas al arrancar el servidor, con el migrador de Drizzle
(`server/migrate.ts`). Una base vacía se provisiona sola en el primer deploy.

**No uses `drizzle-kit push`**: compara el esquema vivo contra `schema.ts` y ofrece
truncar tablas cuando ve una diferencia que no sabe reconciliar.

Para cambiar el esquema:

```bash
# 1. editar drizzle/schema.ts
# 2. generar el SQL
DATABASE_URL="..." npx drizzle-kit generate --name descripcion_del_cambio
# 3. commitear el .sql generado junto con el cambio de schema.ts
```

---

## Desarrollo local

```bash
pnpm install
cp .env.example .env      # y rellenar
pnpm dev                  # http://localhost:3000
```

```bash
pnpm check                # tsc --noEmit
pnpm test                 # vitest
pnpm build                # cliente + bundle del servidor
```

---

## Flujo de uso del panel

El orden importa: los reportes y los códigos cuelgan de un producto.

1. **Products** — crear el producto. Tres campos definen cómo se ve en la página
   pública:
   - **Product line** (ej. `9 M-KREA™ COMPLEX`) es el encabezado bajo el que se
     agrupan las tarjetas. Es texto libre: los productos con el mismo texto caen
     en el mismo grupo. Los que no tengan ninguno van a "Other products".
   - **Name** es el sabor o variante (ej. `Berry`).
   - **Subtitle** es la línea gris de la tarjeta (ej. `4x TABS 100 MG/TAB –
     Botanical Extract`).
2. **Lab Reports** — subir el PDF, asociarlo al producto y anotar el lote.
3. **Verification Codes** — elegir producto, lote y número de consultas; después
   importar el archivo del cliente (CSV o TXT, uno por línea o separados por comas)
   o pegar la lista.

Reimportar un lote **no resetea** los códigos que ya existen, los salta. Si los
reseteara, reimportar un archivo para agregar tres códigos faltantes le devolvería
tres consultas frescas a todo el lote que ya está en la calle.

Cada código admite además, desde la tabla:

- **Desactivar** — deja de validar sin importar el conteo.
- **Resetear conteo** — le devuelve su cupo completo, para cuando un cliente
  legítimo reporta que gastó sus consultas por error.

---

## Marca

Todo lo que lee el visitante y no se administra desde el panel está en
`shared/const.ts`: `BRAND_NAME`, `BRAND_DOMAIN`, `SUPPORT_EMAIL` y
`DEFAULT_MAX_VERIFICATIONS`. Renombrar el sitio es editar ahí, más el `<title>` de
`client/index.html`.

El logo está como texto (`Wordmark` en `client/src/components/PublicLayout.tsx`),
usado en el header y en el footer. Para poner el archivo real se reemplaza ese
componente por un `<img>` y queda cambiado en los dos sitios.
