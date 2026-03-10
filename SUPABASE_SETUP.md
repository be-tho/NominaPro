# Configuración de Supabase para NominaPro

## Pasos para configurar Supabase:

### 1. Habilitar Autenticación en Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. En el menú lateral, selecciona **Authentication** > **Providers**
3. Asegúrate que **Email** esté habilitado (debería estarlo por defecto)
4. Copia el **JWT Secret** (lo encontrarás en Settings > Project Settings > JWT Secret) - no lo necesitas para esta integración, pero es bueno tenerlo

### 2. Crear las tablas en Supabase

1. Ve a **SQL Editor** en el menú lateral
2. Haz clic en **"New Query"**
3. Copia y pega TODO el contenido del archivo `supabase_setup.sql`
4. Haz clic en **"Run"** para ejecutar el SQL

Esto creará:
- Tabla `days` - para guardar los registros de asistencia
- Tabla `user_settings` - para guardar la configuración de precio por unidad
- Índices para mejores performances
- Políticas de Row Level Security (RLS) para proteger los datos

### 3. Verificar las tablas

Después de ejecutar el SQL, verifica que las tablas se crearon correctamente:
- Ve a **Table Editor** en el menú lateral
- Deberías ver dos tablas: `days` y `user_settings`

### 4. Verificar las credenciales en `.env.local`

El archivo `.env.local` ya contiene tus credenciales:
```
VITE_SUPABASE_URL=https://jxvneqhuumimhgzyagiq.supabase.co
VITE_SUPABASE_ANON_KEY=tu_api_key
```

Si necesitas actualizar o verificar estas credenciales:
- Ve a **Project Settings** > **API** en tu dashboard de Supabase
- Copia la **Project URL** y la **anon (public) API Key**

### 5. Iniciar la aplicación

```bash
npm run dev
```

La aplicación ahora se abrirá con una pantalla de login.

## Características de la integración:

- ✅ Sistema de autenticación con email/contraseña
- ✅ Registro de nuevas cuentas
- ✅ Datos persistentes en Supabase
- ✅ Sincronización automática al cambiar datos
- ✅ Seguridad: Cada usuario solo puede ver/modificar sus propios datos
- ✅ Indicadores de carga y sincronización

## Estructura de Autenticación

La aplicación ahora usa:
- **Supabase Auth** para autenticación con email/contraseña
- **Row Level Security (RLS)** para proteger los datos
- Cada usuario tiene acceso solo a sus propios datos
- Los datos se sincronizan automáticamente con la base de datos

## Próximos pasos (opcional)

Si quieres mejorar aún más la aplicación, podrías agregar:
- Recuperación de contraseña
- Cambio de contraseña
- Verificación de email
- Autenticación con OAuth (Google, GitHub, etc.)

