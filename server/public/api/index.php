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
    $st = $pdo->prepare(
        'SELECT id, user_id, `date`, type, created_at, updated_at FROM days WHERE user_id = ? ORDER BY `date` ASC'
    );
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

    try {
        $ins = $pdo->prepare('INSERT INTO days (user_id, `date`, type) VALUES (?, ?, ?)');
        $ins->execute([$user['id'], $date, $type]);
    } catch (PDOException $e) {
        if (($e->errorInfo[1] ?? null) === 1062) {
            nominapro_json(false, null, 'Ya existe un registro para esa fecha', 409);
        }
        throw $e;
    }

    $sel = $pdo->prepare('SELECT id, user_id, `date`, type FROM days WHERE user_id = ? AND `date` = ? LIMIT 1');
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

    $up = $pdo->prepare('UPDATE days SET type = ?, updated_at = CURRENT_TIMESTAMP(6) WHERE user_id = ? AND `date` = ?');
    $up->execute([$type, $user['id'], $date]);
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

// -------------------- settings --------------------
if ($key === 'GET /settings') {
    $user = nominapro_require_user();
    $st = $pdo->prepare(
        'SELECT id, user_id, monthly_salary, created_at, updated_at FROM user_settings WHERE user_id = ? LIMIT 1'
    );
    $st->execute([$user['id']]);
    $row = $st->fetch();
    nominapro_json(true, ['settings' => $row ?: null]);
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

    $st = $pdo->prepare('SELECT id, user_id, monthly_salary FROM user_settings WHERE user_id = ? LIMIT 1');
    $st->execute([$user['id']]);
    nominapro_json(true, ['settings' => $st->fetch()]);
}

// -------------------- payments --------------------
if ($key === 'GET /payments') {
    $user = nominapro_require_user();
    $st = $pdo->prepare(
        'SELECT id, user_id, total_days, daily_value, total_paid, payment_date, period_start, period_end, created_at, updated_at
         FROM payment_history WHERE user_id = ? ORDER BY payment_date DESC'
    );
    $st->execute([$user['id']]);
    $paymentRows = $st->fetchAll();
    foreach ($paymentRows as &$pr) {
        foreach (['payment_date', 'period_start', 'period_end'] as $dk) {
            if (isset($pr[$dk])) {
                $pr[$dk] = substr((string) $pr[$dk], 0, 10);
            }
        }
    }
    unset($pr);
    nominapro_json(true, ['payments' => $paymentRows]);
}

if ($key === 'POST /payments') {
    $user = nominapro_require_user();
    $body = nominapro_read_json_body();

    $totalDays = filter_var($body['total_days'] ?? null, FILTER_VALIDATE_FLOAT);
    $dailyValue = filter_var($body['daily_value'] ?? null, FILTER_VALIDATE_INT);
    $totalPaid = filter_var($body['total_paid'] ?? null, FILTER_VALIDATE_INT);
    $paymentDate = (string) ($body['payment_date'] ?? '');
    $periodStart = (string) ($body['period_start'] ?? '');
    $periodEnd = (string) ($body['period_end'] ?? '');

    if ($totalDays === false || $dailyValue === false || $totalPaid === false) {
        nominapro_json(false, null, 'Datos de pago inválidos', 422);
    }
    foreach ([$paymentDate, $periodStart, $periodEnd] as $d) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
            nominapro_json(false, null, 'Fechas inválidas', 422);
        }
    }

    $ins = $pdo->prepare(
        'INSERT INTO payment_history (user_id, total_days, daily_value, total_paid, payment_date, period_start, period_end)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([
        $user['id'],
        $totalDays,
        $dailyValue,
        $totalPaid,
        $paymentDate,
        $periodStart,
        $periodEnd,
    ]);

    $sel = $pdo->prepare(
        'SELECT id, user_id, total_days, daily_value, total_paid, payment_date, period_start, period_end
         FROM payment_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    );
    $sel->execute([$user['id']]);
    $row = $sel->fetch();
    if (is_array($row)) {
        foreach (['payment_date', 'period_start', 'period_end'] as $dk) {
            if (isset($row[$dk])) {
                $row[$dk] = substr((string) $row[$dk], 0, 10);
            }
        }
    }
    nominapro_json(true, ['payment' => $row]);
}

nominapro_json(false, null, 'Ruta no encontrada', 404);
