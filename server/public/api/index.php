<?php

declare(strict_types=1);

// Repo: server/public/api → server/includes | Hosting plano: public_html/api → public_html/includes
$bootstrap = dirname(__DIR__, 2) . '/includes/bootstrap.php';
if (!is_readable($bootstrap)) {
    $bootstrap = dirname(__DIR__) . '/includes/bootstrap.php';
}
if (!is_readable($bootstrap)) {
    header('Content-Type: application/json; charset=utf-8', true, 500);
    echo json_encode(['ok' => false, 'error' => 'No se encuentra includes/bootstrap.php. Revisá la estructura de carpetas al subir por FTP.']);
    exit;
}
require $bootstrap;

global $pdo;

nominapro_send_cors($corsOrigins);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$route = $_GET['route'] ?? '';
if ($route === '' && !empty($_SERVER['PATH_INFO'])) {
    $route = $_SERVER['PATH_INFO'];
}
$route = '/' . trim((string) $route, '/');
if ($route === '/') {
    nominapro_json(false, null, 'Parámetro route requerido (ej. ?route=/auth/me)', 400);
}

$key = $method . ' ' . $route;
$isValidDate = static function (string $value): bool {
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    return $date !== false && $date->format('Y-m-d') === $value;
};

// -------------------- auth/register --------------------
if ($key === 'POST /auth/register') {
    $body = nominapro_read_json_body();
    $email = filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $password = (string) ($body['password'] ?? '');
    if ($email === false || $email === '') {
        nominapro_json(false, null, 'Email inválido', 422);
    }
    if (strlen($password) < 6) {
        nominapro_json(false, null, 'La contraseña debe tener al menos 6 caracteres', 422);
    }

    $check = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        nominapro_json(false, null, 'El email ya está registrado', 409);
    }

    $id = nominapro_uuid_v4();
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $ins = $pdo->prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
    $ins->execute([$id, $email, $hash]);

    session_regenerate_id(true);
    $_SESSION['user_id'] = $id;
    nominapro_json(true, ['user' => ['id' => $id, 'email' => $email]]);
}

// -------------------- auth/login --------------------
if ($key === 'POST /auth/login') {
    $body = nominapro_read_json_body();
    $email = filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $password = (string) ($body['password'] ?? '');
    if ($email === false || $email === '') {
        nominapro_json(false, null, 'Email inválido', 422);
    }

    $st = $pdo->prepare('SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1');
    $st->execute([$email]);
    $row = $st->fetch();
    if (!$row || empty($row['password_hash']) || !password_verify($password, $row['password_hash'])) {
        nominapro_json(false, null, 'Credenciales incorrectas', 401);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $row['id'];
    nominapro_json(true, ['user' => ['id' => $row['id'], 'email' => $row['email']]]);
}

// -------------------- auth/logout --------------------
if ($key === 'POST /auth/logout') {
    $_SESSION = [];
    if (session_id() !== '') {
        session_destroy();
    }
    nominapro_json(true, null);
}

// -------------------- auth/me --------------------
if ($key === 'GET /auth/me') {
    $uid = $_SESSION['user_id'] ?? null;
    if (!is_string($uid) || $uid === '') {
        nominapro_json(true, ['user' => null]);
    }
    $st = $pdo->prepare('SELECT id, email FROM users WHERE id = ? LIMIT 1');
    $st->execute([$uid]);
    $row = $st->fetch();
    if (!$row) {
        $_SESSION = [];
        nominapro_json(true, ['user' => null]);
    }
    nominapro_json(true, ['user' => ['id' => $row['id'], 'email' => $row['email']]]);
}

// -------------------- days (auth) --------------------
if ($key === 'GET /days') {
    $user = nominapro_require_user();
    $describe = $pdo->query('DESCRIBE days')->fetchAll();
    $columns = array_map(static fn (array $row): string => (string) ($row['Field'] ?? ''), $describe);

    $selectFields = ['id', 'user_id', '`date`', 'type', 'created_at', 'updated_at'];
    if (in_array('additional_title', $columns, true)) {
        $selectFields[] = 'additional_title';
    }
    if (in_array('additional_amount', $columns, true)) {
        $selectFields[] = 'additional_amount';
    }

    $quoted = array_map(static fn (string $field): string => $field === '`date`' ? '`date`' : '`' . str_replace('`', '``', $field) . '`', $selectFields);
    $st = $pdo->prepare('SELECT ' . implode(', ', $quoted) . ' FROM days WHERE user_id = ? ORDER BY `date` ASC');
    $st->execute([$user['id']]);
    $rows = $st->fetchAll();
    foreach ($rows as &$row) {
        $row['date'] = substr((string) $row['date'], 0, 10);
    }
    unset($row);
    nominapro_json(true, ['days' => $rows]);
}

if ($key === 'POST /days') {
    $user = nominapro_require_user();
    $body = nominapro_read_json_body();
    $date = (string) ($body['date'] ?? '');
    $type = (string) ($body['type'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        nominapro_json(false, null, 'Fecha inválida', 422);
    }
    if (!in_array($type, NOMINAPRO_DAY_TYPES, true)) {
        nominapro_json(false, null, 'Tipo de día inválido', 422);
    }

    $describe = $pdo->query('DESCRIBE days')->fetchAll();
    $columns = array_map(static fn (array $row): string => (string) ($row['Field'] ?? ''), $describe);

    $fields = ['user_id', '`date`', 'type'];
    $values = [$user['id'], $date, $type];

    $additionalTitle = trim((string) ($body['additional_title'] ?? ''));
    $additionalAmount = filter_var($body['additional_amount'] ?? null, FILTER_VALIDATE_FLOAT);

    if (in_array('additional_title', $columns, true)) {
        $fields[] = 'additional_title';
        $values[] = $additionalTitle !== '' ? $additionalTitle : null;
    }
    if (in_array('additional_amount', $columns, true)) {
        $fields[] = 'additional_amount';
        $values[] = ($additionalAmount !== false && $additionalAmount > 0) ? $additionalAmount : null;
    }

    try {
        $placeholders = implode(', ', array_fill(0, count($fields), '?'));
        $quotedFields = array_map(static fn (string $field): string => $field === '`date`' ? '`date`' : '`' . str_replace('`', '``', $field) . '`', $fields);
        $ins = $pdo->prepare('INSERT INTO days (' . implode(', ', $quotedFields) . ') VALUES (' . $placeholders . ')');
        $ins->execute($values);
    } catch (PDOException $e) {
        if (($e->errorInfo[1] ?? null) === 1062) {
            nominapro_json(false, null, 'Ya existe un registro para esa fecha', 409);
        }
        throw $e;
    }

    $selectFields = ['id', 'user_id', '`date`', 'type'];
    if (in_array('additional_title', $columns, true)) {
        $selectFields[] = 'additional_title';
    }
    if (in_array('additional_amount', $columns, true)) {
        $selectFields[] = 'additional_amount';
    }
    $quotedSelect = array_map(static fn (string $field): string => $field === '`date`' ? '`date`' : '`' . str_replace('`', '``', $field) . '`', $selectFields);
    $sel = $pdo->prepare('SELECT ' . implode(', ', $quotedSelect) . ' FROM days WHERE user_id = ? AND `date` = ? LIMIT 1');
    $sel->execute([$user['id'], $date]);
    nominapro_json(true, ['day' => $sel->fetch()]);
}

if ($key === 'PATCH /days') {
    $user = nominapro_require_user();
    $body = nominapro_read_json_body();
    $date = (string) ($body['date'] ?? '');
    $type = (string) ($body['type'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        nominapro_json(false, null, 'Fecha inválida', 422);
    }
    if (!in_array($type, NOMINAPRO_DAY_TYPES, true)) {
        nominapro_json(false, null, 'Tipo de día inválido', 422);
    }

    $describe = $pdo->query('DESCRIBE days')->fetchAll();
    $columns = array_map(static fn (array $row): string => (string) ($row['Field'] ?? ''), $describe);
    $fields = ['type = ?'];
    $values = [$type];

    $additionalTitle = trim((string) ($body['additional_title'] ?? ''));
    $additionalAmount = filter_var($body['additional_amount'] ?? null, FILTER_VALIDATE_FLOAT);

    if (in_array('additional_title', $columns, true)) {
        $fields[] = 'additional_title = ?';
        $values[] = $additionalTitle !== '' ? $additionalTitle : null;
    }
    if (in_array('additional_amount', $columns, true)) {
        $fields[] = 'additional_amount = ?';
        $values[] = ($additionalAmount !== false && $additionalAmount > 0) ? $additionalAmount : null;
    }

    $values[] = $user['id'];
    $values[] = $date;
    $up = $pdo->prepare('UPDATE days SET ' . implode(', ', $fields) . ', updated_at = CURRENT_TIMESTAMP(6) WHERE user_id = ? AND `date` = ?');
    $up->execute($values);
    nominapro_json(true, ['updated' => $up->rowCount()]);
}

if ($key === 'DELETE /days') {
    $user = nominapro_require_user();
    $date = (string) ($_GET['date'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        nominapro_json(false, null, 'Parámetro date inválido', 422);
    }
    $del = $pdo->prepare('DELETE FROM days WHERE user_id = ? AND `date` = ?');
    $del->execute([$user['id'], $date]);
    nominapro_json(true, ['deleted' => $del->rowCount()]);
}

if ($key === 'POST /days/delete-all') {
    $user = nominapro_require_user();
    $del = $pdo->prepare('DELETE FROM days WHERE user_id = ?');
    $del->execute([$user['id']]);
    nominapro_json(true, ['deleted' => $del->rowCount()]);
}

// -------------------- settlement adjustments --------------------
if ($key === 'GET /adjustments') {
    $user = nominapro_require_user();
    $st = $pdo->prepare(
        'SELECT id, user_id, label, amount, type, date, notes, created_at, updated_at
         FROM settlement_adjustments
         WHERE user_id = ? ORDER BY date DESC, created_at DESC'
    );
    $st->execute([$user['id']]);
    $rows = $st->fetchAll();
    foreach ($rows as &$row) {
        if (isset($row['date'])) {
            $row['date'] = substr((string) $row['date'], 0, 10);
        }
    }
    unset($row);
    nominapro_json(true, ['adjustments' => $rows]);
}

if ($key === 'POST /adjustments') {
    $user = nominapro_require_user();
    $body = nominapro_read_json_body();

    $label = trim((string) ($body['label'] ?? ''));
    $amount = filter_var($body['amount'] ?? null, FILTER_VALIDATE_FLOAT);
    $type = (string) ($body['type'] ?? '');
    $date = (string) ($body['date'] ?? '');
    if ($label === '') {
        nominapro_json(false, null, 'La descripción es obligatoria', 422);
    }
    if ($amount === false || $amount <= 0) {
        nominapro_json(false, null, 'El monto debe ser mayor a 0', 422);
    }
    if (!in_array($type, ['advance', 'expense', 'discount'], true)) {
        nominapro_json(false, null, 'Tipo de ajuste inválido', 422);
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        nominapro_json(false, null, 'Fecha inválida', 422);
    }

    $ins = $pdo->prepare(
        'INSERT INTO settlement_adjustments (user_id, label, amount, type, date, notes)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([$user['id'], $label, $amount, $type, $date, (string) ($body['notes'] ?? '')]);

    $sel = $pdo->prepare(
        'SELECT id, user_id, label, amount, type, date, notes, created_at, updated_at
         FROM settlement_adjustments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    );
    $sel->execute([$user['id']]);
    $row = $sel->fetch();
    if (is_array($row) && isset($row['date'])) {
        $row['date'] = substr((string) $row['date'], 0, 10);
    }
    nominapro_json(true, ['adjustment' => $row]);
}

if ($key === 'DELETE /adjustments') {
    $user = nominapro_require_user();
    $id = (string) ($_GET['id'] ?? '');
    if ($id === '') {
        nominapro_json(false, null, 'Falta el id del ajuste', 422);
    }

    $del = $pdo->prepare('DELETE FROM settlement_adjustments WHERE user_id = ? AND id = ?');
    $del->execute([$user['id'], $id]);
    nominapro_json(true, ['deleted' => $del->rowCount()]);
}

if ($key === 'POST /adjustments/delete-all') {
    $user = nominapro_require_user();
    $del = $pdo->prepare('DELETE FROM settlement_adjustments WHERE user_id = ?');
    $del->execute([$user['id']]);
    nominapro_json(true, ['deleted' => $del->rowCount()]);
}

// -------------------- settings --------------------
if ($key === 'GET /settings') {
    $user = nominapro_require_user();
    $st = $pdo->prepare('SELECT id, user_id, monthly_salary, created_at, updated_at FROM user_settings WHERE user_id = ? LIMIT 1');
    $st->execute([$user['id']]);
    nominapro_json(true, ['settings' => $st->fetch() ?: null]);
}

if ($key === 'PUT /settings') {
    $user = nominapro_require_user();
    $body = nominapro_read_json_body();
    $salary = filter_var($body['monthly_salary'] ?? null, FILTER_VALIDATE_INT);
    if ($salary === false || $salary <= 0) {
        nominapro_json(false, null, 'El salario debe ser mayor a 0', 422);
    }

    $exists = $pdo->prepare('SELECT id FROM user_settings WHERE user_id = ? LIMIT 1');
    $exists->execute([$user['id']]);

    if ($exists->fetch()) {
        $up = $pdo->prepare('UPDATE user_settings SET monthly_salary = ?, updated_at = CURRENT_TIMESTAMP(6) WHERE user_id = ?');
        $up->execute([$salary, $user['id']]);
    } else {
        $ins = $pdo->prepare('INSERT INTO user_settings (user_id, monthly_salary) VALUES (?, ?)');
        $ins->execute([$user['id'], $salary]);
    }

    $st = $pdo->prepare('SELECT id, user_id, monthly_salary, created_at, updated_at FROM user_settings WHERE user_id = ? LIMIT 1');
    $st->execute([$user['id']]);
    nominapro_json(true, ['settings' => $st->fetch()]);
}

// -------------------- payments --------------------
if ($key === 'GET /payments') {
    $user = nominapro_require_user();
    $st = $pdo->prepare(
        'SELECT id, user_id, total_days, daily_value, total_paid, adjustments_total, net_total, payment_date, period_start, period_end, created_at, updated_at
         FROM payment_history WHERE user_id = ? ORDER BY payment_date DESC'
    );
    $st->execute([$user['id']]);
    $paymentRows = $st->fetchAll();
    $daysByPayment = [];
    if ($paymentRows !== []) {
        $paymentIds = array_column($paymentRows, 'id');
        $placeholders = implode(', ', array_fill(0, count($paymentIds), '?'));
        $daySt = $pdo->prepare(
            'SELECT payment_id, day_date, type, additional_title, additional_amount
             FROM payment_history_days
             WHERE user_id = ? AND payment_id IN (' . $placeholders . ')
             ORDER BY day_date ASC'
        );
        $daySt->execute(array_merge([$user['id']], $paymentIds));
        foreach ($daySt->fetchAll() as $dayRow) {
            $dayRow['date'] = substr((string) $dayRow['day_date'], 0, 10);
            unset($dayRow['day_date']);
            $daysByPayment[$dayRow['payment_id']][] = $dayRow;
        }
    }
    foreach ($paymentRows as &$pr) {
        foreach (['payment_date', 'period_start', 'period_end'] as $dk) {
            if (isset($pr[$dk])) {
                $pr[$dk] = substr((string) $pr[$dk], 0, 10);
            }
        }
        $pr['days'] = $daysByPayment[$pr['id']] ?? [];
    }
    unset($pr);
    nominapro_json(true, ['payments' => $paymentRows]);
}

if ($key === 'PATCH /payments') {
    $user = nominapro_require_user();
    $id = (string) ($_GET['id'] ?? '');
    $body = nominapro_read_json_body();
    $totalDays = filter_var($body['total_days'] ?? null, FILTER_VALIDATE_FLOAT);
    $dailyValue = filter_var($body['daily_value'] ?? null, FILTER_VALIDATE_FLOAT);
    $totalPaid = filter_var($body['total_paid'] ?? null, FILTER_VALIDATE_FLOAT);
    $adjustmentsTotal = filter_var($body['adjustments_total'] ?? null, FILTER_VALIDATE_FLOAT);
    $netTotal = filter_var($body['net_total'] ?? null, FILTER_VALIDATE_FLOAT);
    $paymentDate = (string) ($body['payment_date'] ?? '');
    $periodStart = (string) ($body['period_start'] ?? '');
    $periodEnd = (string) ($body['period_end'] ?? '');

    if ($id === '') {
        nominapro_json(false, null, 'Falta el id del cobro', 422);
    }
    if ($totalDays === false || $totalDays < 0 || $dailyValue === false || $dailyValue < 0 || $totalPaid === false) {
        nominapro_json(false, null, 'Datos de pago inválidos', 422);
    }
    if ($adjustmentsTotal === false || $adjustmentsTotal < 0 || $netTotal === false) {
        nominapro_json(false, null, 'Datos de ajustes inválidos', 422);
    }
    foreach ([$paymentDate, $periodStart, $periodEnd] as $date) {
        if (!$isValidDate($date)) {
            nominapro_json(false, null, 'Fechas inválidas', 422);
        }
    }
    if ($periodStart > $periodEnd) {
        nominapro_json(false, null, 'El inicio del período no puede ser posterior al final', 422);
    }

    $detailCheck = $pdo->prepare(
        'SELECT COUNT(*) FROM payment_history_days
         WHERE user_id = ? AND payment_id = ? AND (day_date < ? OR day_date > ?)'
    );
    $detailCheck->execute([$user['id'], $id, $periodStart, $periodEnd]);
    if ((int) $detailCheck->fetchColumn() > 0) {
        nominapro_json(false, null, 'El rango debe incluir todas las fechas del detalle diario', 422);
    }

    $up = $pdo->prepare(
        'UPDATE payment_history
         SET total_days = ?, daily_value = ?, total_paid = ?, adjustments_total = ?, net_total = ?,
             payment_date = ?, period_start = ?, period_end = ?
         WHERE user_id = ? AND id = ?'
    );
    $up->execute([
        $totalDays,
        $dailyValue,
        $totalPaid,
        $adjustmentsTotal,
        $netTotal,
        $paymentDate,
        $periodStart,
        $periodEnd,
        $user['id'],
        $id,
    ]);

    $sel = $pdo->prepare(
        'SELECT id, user_id, total_days, daily_value, total_paid, adjustments_total, net_total, payment_date, period_start, period_end, created_at, updated_at
         FROM payment_history WHERE user_id = ? AND id = ? LIMIT 1'
    );
    $sel->execute([$user['id'], $id]);
    $row = $sel->fetch();
    if (!$row) {
        nominapro_json(false, null, 'Cobro no encontrado', 404);
    }
    foreach (['payment_date', 'period_start', 'period_end'] as $dateKey) {
        $row[$dateKey] = substr((string) $row[$dateKey], 0, 10);
    }
    nominapro_json(true, ['payment' => $row]);
}

if ($key === 'DELETE /payments') {
    $user = nominapro_require_user();
    $id = (string) ($_GET['id'] ?? '');
    if ($id === '') {
        nominapro_json(false, null, 'Falta el id del cobro', 422);
    }
    $del = $pdo->prepare('DELETE FROM payment_history WHERE user_id = ? AND id = ?');
    $del->execute([$user['id'], $id]);
    if ($del->rowCount() === 0) {
        nominapro_json(false, null, 'Cobro no encontrado', 404);
    }
    nominapro_json(true, ['deleted' => 1]);
}

$isSettlement = $key === 'POST /settlements';
if ($key === 'POST /payments' || $isSettlement) {
    $user = nominapro_require_user();
    $body = nominapro_read_json_body();

    $totalDays = filter_var($body['total_days'] ?? null, FILTER_VALIDATE_FLOAT);
    $dailyValue = filter_var($body['daily_value'] ?? null, FILTER_VALIDATE_FLOAT);
    $totalPaid = filter_var($body['total_paid'] ?? null, FILTER_VALIDATE_FLOAT);
    $adjustmentsTotal = filter_var($body['adjustments_total'] ?? 0, FILTER_VALIDATE_FLOAT);
    $netTotal = filter_var($body['net_total'] ?? ($body['total_paid'] ?? 0), FILTER_VALIDATE_FLOAT);
    $paymentDate = (string) ($body['payment_date'] ?? '');
    $periodStart = (string) ($body['period_start'] ?? '');
    $periodEnd = (string) ($body['period_end'] ?? '');
    $paymentDays = $body['days'] ?? [];

    if ($totalDays === false || $dailyValue === false || $totalPaid === false) {
        nominapro_json(false, null, 'Datos de pago inválidos', 422);
    }
    if ($adjustmentsTotal === false || $netTotal === false) {
        nominapro_json(false, null, 'Datos de ajustes inválidos', 422);
    }
    foreach ([$paymentDate, $periodStart, $periodEnd] as $d) {
        if (!$isValidDate($d)) {
            nominapro_json(false, null, 'Fechas inválidas', 422);
        }
    }
    if ($periodStart > $periodEnd) {
        nominapro_json(false, null, 'El inicio del período no puede ser posterior al final', 422);
    }
    if (!is_array($paymentDays)) {
        nominapro_json(false, null, 'Detalle diario inválido', 422);
    }

    $daySnapshots = [];
    foreach ($paymentDays as $paymentDay) {
        if (!is_array($paymentDay)) {
            nominapro_json(false, null, 'Detalle diario inválido', 422);
        }
        $dayDate = (string) ($paymentDay['date'] ?? '');
        $dayType = (string) ($paymentDay['type'] ?? '');
        $additionalTitle = trim((string) ($paymentDay['additional_title'] ?? ''));
        $amountValue = $paymentDay['additional_amount'] ?? null;
        $additionalAmount = $amountValue === null || $amountValue === ''
            ? null
            : filter_var($amountValue, FILTER_VALIDATE_FLOAT);

        if (!$isValidDate($dayDate) || $dayDate < $periodStart || $dayDate > $periodEnd) {
            nominapro_json(false, null, 'La fecha de un día está fuera del período', 422);
        }
        if (!in_array($dayType, NOMINAPRO_DAY_TYPES, true)) {
            nominapro_json(false, null, 'Tipo de día inválido en el detalle', 422);
        }
        if ($additionalAmount === false || ($additionalAmount !== null && $additionalAmount < 0)) {
            nominapro_json(false, null, 'Importe adicional inválido', 422);
        }

        $daySnapshots[] = [
            'date' => $dayDate,
            'type' => $dayType,
            'additional_title' => $additionalTitle !== '' ? $additionalTitle : null,
            'additional_amount' => $additionalAmount,
        ];
    }

    $paymentId = nominapro_uuid_v4();
    $daysDeleted = 0;
    $adjustmentsDeleted = 0;
    if ($isSettlement) {
        $pdo->beginTransaction();
    }

    try {
        $ins = $pdo->prepare(
            'INSERT INTO payment_history (id, user_id, total_days, daily_value, total_paid, adjustments_total, net_total, payment_date, period_start, period_end)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $paymentId,
            $user['id'],
            $totalDays,
            $dailyValue,
            $totalPaid,
            $adjustmentsTotal,
            $netTotal,
            $paymentDate,
            $periodStart,
            $periodEnd,
        ]);

        if ($isSettlement) {
            $dayInsert = $pdo->prepare(
                'INSERT INTO payment_history_days (payment_id, user_id, day_date, type, additional_title, additional_amount)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            foreach ($daySnapshots as $daySnapshot) {
                $dayInsert->execute([
                    $paymentId,
                    $user['id'],
                    $daySnapshot['date'],
                    $daySnapshot['type'],
                    $daySnapshot['additional_title'],
                    $daySnapshot['additional_amount'],
                ]);
            }

            $deleteDays = $pdo->prepare('DELETE FROM days WHERE user_id = ?');
            $deleteDays->execute([$user['id']]);
            $daysDeleted = $deleteDays->rowCount();

            $deleteAdjustments = $pdo->prepare('DELETE FROM settlement_adjustments WHERE user_id = ?');
            $deleteAdjustments->execute([$user['id']]);
            $adjustmentsDeleted = $deleteAdjustments->rowCount();
        }

        $sel = $pdo->prepare(
            'SELECT id, user_id, total_days, daily_value, total_paid, adjustments_total, net_total, payment_date, period_start, period_end
             FROM payment_history WHERE user_id = ? AND id = ? LIMIT 1'
        );
        $sel->execute([$user['id'], $paymentId]);
        $row = $sel->fetch();
        if (is_array($row)) {
            foreach (['payment_date', 'period_start', 'period_end'] as $dk) {
                if (isset($row[$dk])) {
                    $row[$dk] = substr((string) $row[$dk], 0, 10);
                }
            }
        }

        if ($isSettlement) {
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if ($isSettlement && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    $response = ['payment' => $row];
    if ($isSettlement) {
        $response['cleared'] = ['days' => $daysDeleted, 'adjustments' => $adjustmentsDeleted];
    }
    nominapro_json(true, $response);
}

nominapro_json(false, null, 'Ruta no encontrada', 404);
