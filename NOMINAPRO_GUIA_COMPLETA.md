## 📊 **NOMINAPRO**: Sistema de Gestión de Nómina para PyMEs

Acabamos de implementar un **módulo completo de liquidación y gestión de nómina** escalable para tu sistema.

---

## 🚀 **¿QUÉ SE IMPLEMENTÓ?**

### **1. Base de Datos Relacional**
Se creó un schema completo con **3 tablas principales**:

- **`empleados`**: Información de tu staff (nombre, email, sueldo base)
- **`registros_diarios`**: Horas trabajadas por día (con timestamp)
- **`historial_pagos`**: Registro completo de cada liquidación ejecutada

**Características de Seguridad:**
- Row Level Security (RLS): Cada empresa solo ve sus datos
- Índices optimizados para consultas rápidas
- Triggers automáticos para auditoría (updated_at)

---

## 📋 **PASO 1: EJECUTAR LA MIGRACIÓN DE BASE DE DATOS**

### **Opción A: Usando Supabase Dashboard (Recomendado)**

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Abre **SQL Editor**
3. Copia y pega el contenido completo del archivo **`payroll_migration.sql`**
4. Haz clic en **"Execute"**
5. ✅ Las tablas se crearán automáticamente con todas las políticas de seguridad

### **Opción B: Usando CLI de Supabase**

```bash
supabase db push --file payroll_migration.sql
```

### **Después de migrar:**
- Verifica que las tablas existan en el SQL Editor de Supabase
- Comprueba las políticas RLS están activadas
- Prueba que puedas ver las vistas: `v_horas_pendientes` y `v_liquidaciones_por_empleado`

---

## 🔧 **PASO 2: USAR EL PANEL DE ADMINISTRACIÓN**

### **Acceder al Panel Admin**

1. En la app web, busca el botón **📋 (Briefcase)** en la esquina superior derecha
2. Haz clic para entrar al **Panel de Administración**
3. Verás 3 secciones principales:

### **A. GESTIONAR EMPLEADOS**

**Agregar un Empleado:**
1. Haz clic en **"+ Agregar Empleado"**
2. Completa:
   - **Nombre**: Juan Pérez
   - **Email**: juan@tuempresa.com
   - **Sueldo Mensual**: $700.000 (sin puntos ni comas)
3. Haz clic en **"Agregar"**

**Registrar Horas Trabajadas:**
1. En la tabla de empleados, haz clic en **"Registrar Horas"** junto al nombre
2. Completa:
   - **Cantidad de Horas**: 8 (o 4.5 para medio día)
   - **Fecha**: Selecciona del calendario
3. Haz clic en **"Registrar"**

**Nota:** Las horas se acumulan automáticamente por empleado hasta la liquidación.

---

## 💰 **PASO 3: EJECUTAR UNA LIQUIDACIÓN**

### **El Flujo Completo de Liquidación**

#### **1️⃣ Abrir Preview**
- Haz clic en **"Generar Liquidación y Pago"** (botón verde)
- El sistema calcula automáticamente:

```
Valor Hora = (Sueldo Mensual ÷ 26) ÷ 10
Total a Pagar = Horas Acumuladas × Valor Hora
```

**Ejemplo:**
- Sueldo: $700.000
- Valor Hora = ($700.000 ÷ 26) ÷ 10 = **$2.692,31**
- Si trabajó 80 horas = 80 × $2.692,31 = **$215.384,62**

#### **2️⃣ Revisar el Preview**
Se abrirá un modal gigante mostrando:
✅ Cada empleado con sus horas pendientes  
✅ El valor hora calculado  
✅ **TOTAL GENERAL** a pagar  
✅ Resumen por empleado

#### **3️⃣ ⚠️ BOTÓN DE PÁNICO**
Antes de confirmar, el sistema te pide:
> *"¿Estás seguro? Se resetearán las horas de X empleados"*

Esto es intencional: **previene clics accidentales**

#### **4️⃣ Confirmar Liquidación**
- Haz clic en **"Confirmar Liquidación"** (botón verde grande)
- **Automáticamente:**
  - ✓ Se crean registros en `historial_pagos`
  - ✓ Se marca como "liquidado" cada registro de horas
  - ✓ El contador de horas de cada empleado vuelve a **0**
  - ✓ Se genera un comprobante (fecha, período, monto)

---

## 📊 **PASO 4: CONSULTAR HISTORIAL DE PAGOS**

### **Ver Todos los Pagos Realizados**

1. Haz clic en **"Historial de Pagos"** (botón morado)
2. Se abre una ventana con:
   - **Tabla completa** de liquidaciones
   - **Resumen por empleado** (total pagado, horas, promedio)
   - **Filtros** por estado (pendiente/pagado/rechazado)

### **Descargar Reporte CSV**

-Haz clic en **"Descargar como CSV"**
- Se descarga automáticamente un archivo Excel-compatible
- Perfecto para reportes contables o auditoría

---

## 🔐 **CARACTERÍSTICAS DE SEGURIDAD IMPLEMENTADAS**

### **1. Row Level Security (RLS)**
```sql
-- Solo el administrador ve sus empleados
SELECT * FROM empleados 
WHERE empresa_id = auth.uid()
```

### **2. Precisión Decimal**
```typescript
// Guardamos en centavos (BIGINT) para evitar errores decimales
Sueldo: $700.000 = 70000000 centavos
Cálculo se hace internamente, sin problemas de Float
```

### **3. Validaciones en Base de Datos**
- Email único por empresa
- No se pueden duplicar registros del mismo día
- Cascada de eliminación (si borras un empleado, se limpian sus registros)

### **4. Auditoría Automatizada**
```sql
-- Cada cambio queda registrado
created_at, updated_at automáticos
```

---

## 📐 **FÓRMULAS IMPLEMENTADAS**

### **Cálculo del Valor Hora**
```
Valor Hora = (Sueldo Mensual ÷ 26 días) ÷ 10 horas

Explicación:
- 26 = días de trabajo reales en mes comercial
- 10 = horas de trabajo 'equivalencia'
```

**Ejemplo Real:**
```
Sueldo = $700.000
Valor Hora = ($700.000 ÷ 26) ÷ 10 = $2.692,31

Si trabajó 8 horas:
Pago = 8 × $2.692,31 = $21.538,46
```

### **Precisión Garantizada**
- ✓ Se mantienen decimales hasta el cálculo final
- ✓ Redondeo solo al guardar en BD
- ✓ No hay pérdida de centavos

---

## 🛠️ **ESTRUCTURA DE ARCHIVOS NUEVOS**

```
src/components/
├── AdminPanel.tsx              # Panel principal (empleados + liquidación)
├── SettlementModal.tsx         # Modal de preview y confirmación
└── PaymentHistoryView.tsx      # Visor de historial de pagos

src/lib/
└── database.ts (actualizado)   # Nuevas funciones de nómina

Raíz del proyecto/
└── payroll_migration.sql       # Script de migración BD
```

---

## 🎯 **CHECKLIST TO USAR LA APP**

- [ ] ✅ Ejecuté la migración SQL en Supabase
- [ ] ✅ Agregué un empleado de prueba
- [ ] ✅ Registré algunas horas trabajadas
- [ ] ✅ Verifiqué el cálculo del Valor Hora
- [ ] ✅ Ejecuté una liquidación completa
- [ ] ✅ Revisé el historial de pagos
- [ ] ✅ Cerré la sesión y volví a iniciar (RLS funciona)

---

## 🐛 **TROUBLESHOOTING**

### **"Error: Usuario no autenticado"**
- Verifica que iniciaste sesión correctamente
- Comprueba que el token de Autenticación de Supabase sea válido

### **"No hay empleados"**
- Recuerda agregar empleados desde el botón "Agregar Empleado"
- Los datos se guardan en BD, no localmente

### **"Error al ejecutar liquidación"**
- Verifica que haya horas registradas (liquidado = false)
- Comprueba que los sueldos estén en formato correcto (números)

### **Las horas no se resetean**
- Las horas se marcan como "liquidado = true"
- Para nuevas horas, el contador se reinicia desde 0
- El historial de pagos guarda el registro permanente

---

## 💡 **TIPS Y MEJORES PRÁCTICAS**

### **1. Liquidaciones Mensuales**
Ejecuta una liquidación al final de cada mes. El sistema guarda:
- Fecha inicio período
- Fecha fin período
- Total pagado
- Cantidad de horas

### **2. Verificar Valores Hora**
Si el Valor Hora no se ve correcto:
1. Verifica que el sueldo mensual esté sin puntos/comas
2. Usa la fórmula: Sueldo ÷ 26 ÷ 10 = Valor Hora esperado

### **3. Backup de Datos**
- Exporta CSV regularmente desde "Historial de Pagos"
- Guarda esos reportes para auditoría

### **4. Múltiples Empleados**
- Cada empleado puede tener su propio Sueldo Mensual
- La liquidación se calcula individualmente

---

## 🚀 **PRÓXIMAS MEJORAS SUGERIDAS**

Si quieres escalar aún más:

1. **Descuentos/Bonificaciones**: Agregar campos para retenciones
2. **Exportar Comprobantes**: PDF con detalles de pago
3. **Notificaciones**: Alertas cuando se ejecuta liquidación
4. **Múltiples Roles**: Operador (registra horas) vs Admin (liquida)
5. **Integraciones**: Exportar a contabilidad automáticamente

---

## 📞 **SOPORTE**

Si encuentras problemas:
1. Verifica los logs de Supabase (SQL Editor)
2. Comprueba que las políticas RLS estén correctas
3. Asegúrate de que la migración se ejecutó completamente
4. Revisa la consola del navegador (F12) para errores JS

---

## 🎉 **¡ESTÁS LISTO!**

Tu sistema ahora puede:
- ✅ Gestionar empleados y sus sueldos
- ✅ Registrar horas trabajadas automáticamente
- ✅ Calcular liquidaciones sin errores decimales
- ✅ Generar reportes de pagos
- ✅ Mantener historial completo de auditoría

**¡A escalar tu PyME! 🚀**

---

*Última actualización: 22 de Febrero de 2026*  
*Sistema: NominaPro v1.0*  
*Hecho con ❤️ para tu empresa*
