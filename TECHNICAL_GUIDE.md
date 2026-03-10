## 🔧 **GUÍA TÉCNICA - NominaPro Payroll System**

Esta guía es para desarrolladores que necesiten mantener o extender el sistema.

---

## 📦 **ESTRUCTURA DE LA BASE DE DATOS**

### **Tabla: `empleados`**
Almacena la información de cada empleado.

```sql
CREATE TABLE empleados (
  id uuid PRIMARY KEY,                    -- UUID generado por Auth
  empresa_id uuid,                        -- Foreign Key al usuario (propietario)
  nombre VARCHAR(255) NOT NULL,           -- Nombre completo
  email VARCHAR(255) NOT NULL,            -- Email (único por empresa)
  sueldo_base BIGINT NOT NULL,            -- En CENTAVOS (ej: 70000000 = $700.000)
  horas_acumuladas DECIMAL(10,2),         -- Total de horas sin liquidar
  estado VARCHAR(50) DEFAULT 'activo',    -- activo, inactivo, suspendido
  fecha_inicio_labores DATE,              -- Cuando se contrató
  created_at TIMESTAMP,                   -- Auditoría
  updated_at TIMESTAMP                    -- Auditoría
);
```

**⚠️ IMPORTANTE:**
- `sueldo_base` se guarda en **CENTAVOS** para evitar errores de Float
- $700.000 = 70000000 (centavos)
- Esto garantiza precisión decimal sin redondeos erróneos

---

### **Tabla: `registros_diarios`**
Registro de horas trabajadas día a día.

```sql
CREATE TABLE registros_diarios (
  id uuid PRIMARY KEY,
  empleado_id uuid,                       -- Foreign Key a empleados
  horas DECIMAL(10,2) NOT NULL,           -- Cantidad de horas (ej: 8, 4.5)
  fecha DATE NOT NULL,                    -- Fecha del trabajo
  liquidado BOOLEAN DEFAULT FALSE,        -- ¿Ya fue pagado?
  concepto VARCHAR(255),                  -- Tipo de trabajo (opcional)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

UNIQUE(empleado_id, fecha)  -- No duplicar registros del mismo día
```

**Flujo:**
1. Se registra con `liquidado = FALSE`
2. Cuando se ejecuta liquidación, se cambia a `TRUE`
3. Las horas sin liquidar se cuentan en el preview

---

### **Tabla: `historial_pagos`**
Registro permanente de cada liquidación ejecutada.

```sql
CREATE TABLE historial_pagos (
  id uuid PRIMARY KEY,
  empresa_id uuid,                        -- Auditoría: quién liquidó
  empleado_id uuid,                       -- A quién se le pagó
  total_pagado BIGINT,                    -- En CENTAVOS
  cantidad_horas_liquidadas DECIMAL(10,2),-- Total de horas pagadas
  fecha_pago DATE,                        -- Cuándo se pagó
  fecha_inicio_periodo DATE,              -- Rango de período
  fecha_fin_periodo DATE,
  detalle_periodo VARCHAR(500),           -- "Del 1 al 30 de Enero"
  comprobante_numero INT,                 -- Número de receipt
  estado_pago VARCHAR(50),                -- pendiente, pagado, rechazado
  metodo_pago VARCHAR(100),               -- efectivo, transferencia, etc.
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Propósito:**
- Historial completo de auditoría
- Los datos originales quedan intactos
- Permite reportes históricos

---

## 🔐 **ROW LEVEL SECURITY (RLS)**

Cada usuario solo ve sus propios datos:

```sql
-- Ejemplo: Política para leer empleados
CREATE POLICY "Users can view their own employees"
  ON empleados FOR SELECT
  USING (auth.uid() = empresa_id);

-- Resultado: SELECT * FROM empleados
-- Solo retorna empleados donde empresa_id = auth.uid() del usuario
```

**Esto significa:**
- ✅ Usuario A no puede ver empleados de Usuario B
- ✅ No hay hacks de SQL injection que puedan burlar esto
- ✅ Está enforced en la Base de Datos, no en la aplicación

---

## 💻 **FUNCIONES DE LA API - `database.ts`**

### **CRUD de Empleados**

```typescript
// Crear empleado
async createEmployee(employee: Employee): Promise<Employee>

// Ejemplo:
createEmployee({
  nombre: "Juan Pérez",
  email: "juan@empresa.com",
  sueldo_base: 700000  // en soles (se convierte a centavos internamente)
})
```

```typescript
// Obtener todos los empleados de la empresa
async fetchEmployees(): Promise<Employee[]>

// Retorna array con todos los empleados activos
```

```typescript
// Actualizar empleado
async updateEmployee(empleadoId: string, updateData: Partial<Employee>): Promise<Employee>

// Ejemplo:
updateEmployee('emp-123', { 
  sueldo_base: 800000 // Nuevo sueldo
})
```

```typescript
// Eliminar empleado
async deleteEmployee(empleadoId: string): Promise<void>

// ⚠️ Esto también borra sus registros por CASCADE
```

---

### **CRUD de Registros Diarios**

```typescript
// Registrar horas trabajadas
async recordDailyHours(
  empleadoId: string, 
  horas: number,        // 8, 4.5, etc.
  fecha: string         // "2026-02-22"
): Promise<DailyRecord>
```

```typescript
// Obtener horas no liquidadas de un empleado
async fetchUnliQuidatedRecords(empleadoId: string): Promise<DailyRecord[]>

// Retorna array de registros donde liquidado = false
```

```typescript
// Obtener TODAS las horas sin liquidar en la empresa
async fetchAllUnliQuidatedRecords(): Promise<DailyRecord[]>

// Útil para el preview de liquidación
```

---

### **CÁLCULOS**

```typescript
// Calcula Valor Hora usando la fórmula
function calculateHourlyRate(sueldoMensualEnSoles: number): number {
  return sueldoMensualEnSoles / 26 / 10
}

// Ejemplo:
calculateHourlyRate(700000)  // Retorna: 2692.31 (valor hora)
```

---

### **PREVIEW Y LIQUIDACIÓN**

```typescript
// Genera el preview de liquidación
async generateSettlementPreview(): Promise<SettlementPreview[]>

// Retorna:
[
  {
    empleado_id: "emp-123",
    nombre_empleado: "Juan Pérez",
    horas_acumuladas: 80,
    valor_hora: 2692.31,
    total_a_pagar: 215384.62
  },
  // ... más empleados
]
```

```typescript
// EJECUTA la liquidación (PUNTO DE NO RETORNO)
async executeSettlement(): Promise<{
  success: boolean,
  totalPagado: number,
  registrosProcesados: number,
  message: string
}>

// Qué hace:
// 1. Para cada empleado con horas pendientes:
//    - Crea registro en historial_pagos
//    - Marca registros_diarios como liquidado = true
//    - Resetea horas_acumuladas a 0
// 2. Retorna resumen de qué se pagó
```

---

### **HISTORIAL**

```typescript
// Obtener todos los pagos de la empresa
async fetchPaymentHistory(): Promise<PaymentHistory[]>

// Retorna: Todos los pagos ordenados por fecha (más reciente primero)
```

```typescript
// Obtener pagos de un empleado específico
async fetchPaymentHistoryByEmployee(empleadoId: string): Promise<PaymentHistory[]>
```

---

## 🔄 **FLUJO COMPLETO DE LIQUIDACIÓN**

```
1. Usuario abre AdminPanel
   ↓
2. Hace clic en "Generar Liquidación"
   ↓
3. generateSettlementPreview() se ejecuta
   ↓
4. Consulta: SELECT * FROM empleados WHERE empresa_id = auth.uid()
   ↓
5. Para cada empleado:
   - Obtiene registros_diarios donde liquidado = false
   - Suma las horas
   - Calcula: total = horas × (sueldo / 26 / 10)
   ↓
6. Retorna array con preview de qué se pagará
   ↓
7. Usuario ve el preview (con confirmación de pánico)
   ↓
8. Si confirma, executeSettlement() se ejecuta
   ↓
9. Inicia una transacción:
   BEGIN TRANSACTION
   
   - INSERT INTO historial_pagos (cada empleado)
   - UPDATE registros_diarios SET liquidado = true
   - UPDATE empleados SET horas_acumuladas = 0
   
   COMMIT TRANSACTION
   ↓
10. Actualiza UI con resultado
    ↓
11. Historial se refleja en PaymentHistoryView
```

---

## 📊 **VISTAS SQL ÚTILES**

Se crearon 2 vistas para reportes rápidos:

### **v_horas_pendientes**
```sql
SELECT
  e.id, e.nombre, e.email,
  e.sueldo_base / 100 as sueldo_mensual,
  SUM(rd.horas) as total_horas_pendientes,
  (e.sueldo_base / 100) / 26 / 10 as valor_hora,
  SUM(rd.horas) * ((e.sueldo_base / 100) / 26 / 10) as total_a_pagar
FROM empleados e
LEFT JOIN registros_diarios rd ON e.id = rd.empleado_id AND rd.liquidado = FALSE
WHERE e.estado = 'activo'
GROUP BY e.id;
```

**Uso:** Ver en tiempo real cuánto se adeuda a cada empleado.

---

### **v_liquidaciones_por_empleado**
```sql
SELECT
  e.nombre,
  hp.fecha_pago,
  hp.cantidad_horas_liquidadas,
  hp.total_pagado / 100 as total_pagado,
  hp.detalle_periodo
FROM empleados e
JOIN historial_pagos hp ON e.id = hp.empleado_id
ORDER BY e.nombre, hp.fecha_pago DESC;
```

**Uso:** Reporte histórico de qué se pagó.

---

## 🧪 **TESTING - CASOS DE PRUEBA**

### **Caso 1: Crear Empleado**
```typescript
import { createEmployee } from './lib/database'

const emp = await createEmployee({
  nombre: "Ana García",
  email: "ana@test.com",
  sueldo_base: 500000
})
// ✅ emp.id debería tener un UUID válido
```

### **Caso 2: Registrar Horas**
```typescript
import { recordDailyHours, fetchUnliQuidatedRecords } from './lib/database'

await recordDailyHours('emp-id-123', 8, '2026-02-22')
await recordDailyHours('emp-id-123', 8, '2026-02-23')

const records = await fetchUnliQuidatedRecords('emp-id-123')
// ✅ records.length === 2
// ✅ records[0].liquidado === false
```

### **Caso 3: Calcular Valor Hora**
```typescript
import { calculateHourlyRate } from './lib/database'

const rate = calculateHourlyRate(700000)
// ✅ rate === 2692.3076923...
```

### **Caso 4: Liquidación Completa**
```typescript
import { generateSettlementPreview, executeSettlement } from './lib/database'

const preview = await generateSettlementPreview()
// ✅ preview[0].total_a_pagar > 0

const result = await executeSettlement()
// ✅ result.success === true
// ✅ result.registrosProcesados === 1
```

---

## 🚨 **VALIDACIONES IMPORTANTES**

```typescript
// En database.ts, antes de insertar:

if (!employee.nombre || !employee.email) {
  throw new Error('Nombre y email son requeridos')
}

if (employee.sueldo_base <= 0) {
  throw new Error('Sueldo debe ser mayor a 0')
}

if (horas <= 0) {
  throw new Error('Las horas deben ser positivas')
}
```

---

## 🔍 **DEBUGGING**

### **Ver registros en la BD:**
```sql
-- Supabase SQL Editor

SELECT * FROM empleados;
SELECT * FROM registros_diarios;
SELECT * FROM historial_pagos;
```

### **Ver políticas RLS activas:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'empleados';
```

### **Limpiar datos de prueba:**
```sql
DELETE FROM historial_pagos WHERE empresa_id = 'user-id';
DELETE FROM registros_diarios WHERE empleado_id IN (
  SELECT id FROM empleados WHERE empresa_id = 'user-id'
);
DELETE FROM empleados WHERE empresa_id = 'user-id';
```

---

## 📈 **ESCALABILIDAD**

El sistema está diseñado para:
- ✅ Miles de empleados en una empresa
- ✅ Años de histórico sin problemas
- ✅ Consultas rápidas con los índices creados
- ✅ Precisión decimal garantizada (centavos)

**Optimizaciones aplicadas:**
- Índices en empresa_id, empleado_id, fecha
- Índice en liquidado (consultas frecuentes)
- Vistas materializadas para reportes rápidos
- BIGINT para dinero (no Float)

---

## 🤝 **EXTENSIONES FUTURAS**

### **Agregar Descuentos:**
```typescript
interface Descuento {
  tipo: 'afiliacion' | 'impuesto' | 'otro'
  porcentaje: number
  monto: number
}
```

### **Agregar Bonificaciones:**
```typescript
interface Bonificacion {
  concepto: string
  monto: number
  fecha_pago: Date
}
```

### **Múltiples Períodos de Pago:**
```typescript
enum PeriodoPago {
  SEMANAL = 7,
  QUINCENAL = 14,
  MENSUAL = 30
}
```

---

## 📞 **CONTACTO & SOPORTE**

Si algo no funciona:
1. Revisa los logs en Supabase
2. Verifica RLS policies en SQL Editor
3. Prueba con las queries de testing
4. Comprueba que auth.uid() retorna el UUID correcto

---

*Documento técnico - NominaPro v1.0*  
*Última actualización: 22 Feb 2026*
