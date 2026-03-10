# ⚡ QUICK REFERENCE - NominaPro

## 🎯 ACCESOS RÁPIDOS

### **Panel Admin**
```
Botón: 📋 (Briefcase) - Header superior derecho
Acceso: Click → Panel de control
```

### **Crear Empleado**
```
1. Panel Admin → "Agregar Empleado"
2. Nombre | Email | Sueldo (ej: 700000)
3. Click "Agregar"
```

### **Registrar Horas**
```
1. Panel Admin → "Registrar Horas" (botón azul)
2. Selector empleado
3. Horas (ej: 8) + Fecha
4. Click "Registrar"
```

### **Generar Liquidación**
```
1. Panel Admin → "Generar Liquidación" (botón verde)
2. Revisar Preview con totales
3. ⚠️ Confirmar (botón de pánico)
4. ✅ Liquidación ejecutada
```

### **Ver Historial de Pagos**
```
1. Panel Admin → "Historial de Pagos" (botón morado)
2. Tabla completa de pagos
3. Descargar CSV para reportes
```

---

## 🧮 FÓRMULA MÁGICA

```
Valor Hora = (Sueldo Mensual ÷ 26) ÷ 10

Ejemplo:
Sueldo: $700.000
Valor Hora = ($700.000 ÷ 26) ÷ 10 = $2.692,31

Si trabajó 80 horas:
Pago = 80 × $2.692,31 = $215.384,62
```

---

## 📋 CAMPOS IMPORTANTES

### **Empleados**
```
ID             : UUID (auto)
Nombre         : Texto (requerido)
Email          : Email (único por empresa)
Sueldo Base    : Número en soles (ej: 700000)
Horas Acum.    : Calcula automático
```

### **Registros de Horas**
```
ID             : UUID (auto)
Empleado ID    : Foreign key
Horas          : Decimal (8, 4.5, etc)
Fecha          : Formato: YYYY-MM-DD
Liquidado      : true/false (auto)
```

### **Historial de Pagos**
```
ID             : UUID (auto)
Empleado ID    : FK
Total Pagado   : En soles (auto-calcula)
Horas Liq.     : Suma de horas pagadas
Período        : Rango de fechas
```

---

## ⚠️ CUIDADOS IMPORTANTES

### **Sueldo Base**
```
❌ MALO:   "700.000"  → Texto
❌ MALO:   "700,000"  → Coma
✅ BIEN:   700000     → Número puro
```

### **Fecha**
```
❌ MALO:   "22/02/2026" → DD/MM/YYYY
✅ BIEN:   "2026-02-22" → Usa calendario
```

### **Liquidación**
```
⚠️  Una vez ejecutada NO se puede deshacer
⚠️  Las horas se resetean a 0
✅ Pero quedan registradas en Historial
```

---

## 🔍 VALIDACIONES AUTOMÁTICAS

```
✅ Email único por empresa (no duplicar)
✅ Horas positivas (no negativas)
✅ Sueldo > 0 (no puede tener deuda)
✅ Una entrada por día por empleado
❌ Si falla → Ves error en rojo
```

---

## 📊 REPORTES DISPONIBLES

### **En Aplicación**
```
- Dashboard con totales
- Tabla de empleados
- Tabla de pagos
- Resumen por período
```

### **Exportables (CSV)**
```
- Historial de pagos completo
- Datos para Excel
- Formato: empleado, fecha, horas, monto
```

---

## 🆘 TROUBLESHOOTING RÁPIDO

| Problema | Solución |
|----------|----------|
| No veo AdminPanel | ¿Inició sesión? Busca botón 📋 |
| Email duplicado | Email debe ser único por empleado |
| Liquidación no aparece | Registra horas primero |
| Errores TypeScript | Ejecuta: `npm run build` |
| RLS error Supabase | Ejecuta `payroll_migration.sql` |
| Cifras raras | Verifica formato sueldo (sin puntos) |

---

## 🎮 FLUJO TÍPICO DIARIO

```
MAÑANA:
1. Inicias sesión en NominaPro
2. Vas a Panel Admin (📋)
3. Registras horas de los empleados
   → Hoy 8 horas, Mañana 8 horas, etc.

FINAL DE MES:
4. Ejecutas "Generar Liquidación"
5. Ves preview con totales
6. Confirmas
7. ✅ Pagos registrados automáticamente

DESPUÉS:
8. Descargas CSV para contador/contador
9. Historial queda grabado forever
```

---

## 💪 CASOS TÍPICOS

### **Caso 1: Empleado 5 días x 8 horas**
```
Registro:
- Día 1: 8 horas
- Día 2: 8 horas
- Día 3: 8 horas
- Día 4: 8 horas
- Día 5: 8 horas
Total: 40 horas

Liquidación:
Sueldo: $500.000
Valor Hora: $192,31
Pago: 40 × $192,31 = $7.692,31
```

### **Caso 2: 3 Empleados Simultáneamente**
```
Empleado A: 80 hrs × $269,23 = $21.538,46
Empleado B: 75 hrs × $230,77 = $17.307,69
Empleado C: 88 hrs × $307,69 = $27.076,92

Total simultáneo: $65.923,07
```

---

## 🔐 PRIVACIDAD Y SEGURIDAD

```
✅ Tus datos no los ve otro usuario
✅ Email encriptado en tránsito
✅ BD tiene Row Level Security
✅ Supabase audita todo
✅ Historial permanente (no se borra)
```

---

## 📞 NÚMEROS ÚTILES DE REFERENCIA

```
Días laborales comerciales por mes: 26
Horas estándar por jornada: 10
Fórmula divisor sueldo: 26 ÷ 10 = 2.6

Esto significa:
- $260.000 de sueldo = $10 por hora
- $700.000 de sueldo = $26,92 por hora
```

---

## 📱 ATAJOS (Si tuvieras app móvil)

```
Registrar horas: Ctrl/Cmd + H
Abrir Admin: Ctrl/Cmd + A
Liquidar: Ctrl/Cmd + L
Historial: Ctrl/Cmd + P

(Actualmente solo con clicks)
```

---

## 🎯 MÉTRICAS POR CALCULAR

```
Total pagado a empleados: SUM(historial_pagos)
Promedio por hora: Total ÷ Total Horas
Emplead más activo: Por cantidad de horas
Mes más caro: Mira gráfico historial
Retorno de inversión: (Horas × Valor) = Ganancia
```

---

## 🌍 IDIOMA Y FORMATO

```
Idioma: Español (es-AR)
Divisa: ARS ($)
Formato Dinero: $123.456,78
Formato Fecha: DD/MM/YYYY (visual)
Formato BD: YYYY-MM-DD (ISO)
```

---

## 🚀 EN PRODUCCIÓN

Cuando subes a servidor:
```
1. Asegúrate de tener dist/ limpio
2. npm run build (último)
3. Sube dist/* a tu servidor FTP
4. Accede vía dominio
5. ¡Ya funciona!
```

---

## 💡 PRO TIPS

```
1. Haz backup CSV cada mes
2. Verifica saldos antes de liquidar
3. Guarda emails de comprobantes
4. Revisa historial mensualmente
5. Reporta errores con screenshot
6. No edites BD manualmente (usar app)
7. Cambia contraseña regularmente
```

---

*Quick Reference Card - NominaPro v1.0*  
*Guardá este archivo para referencia rápida* 📌
