<?php

declare(strict_types=1);

/**
 * Loads DB config from environment variables or includes/config.local.php
 */

$configPath = __DIR__ . '/config.local.php';
if (is_readable($configPath)) {
    /** @var array $cfg */
    $cfg = require $configPath;
} else {
    $cfg = [];
}

$dbHost = $cfg['db_host'] ?? getenv('NOMINAPRO_DB_HOST') ?: '127.0.0.1';
$dbName = $cfg['db_name'] ?? getenv('NOMINAPRO_DB_NAME') ?: 'nominapro';
$dbUser = $cfg['db_user'] ?? getenv('NOMINAPRO_DB_USER') ?: 'root';
$dbPass = $cfg['db_pass'] ?? getenv('NOMINAPRO_DB_PASS') ?: '';
$dbCharset = $cfg['db_charset'] ?? 'utf8mb4';

$corsRaw = $cfg['cors_origins'] ?? getenv('NOMINAPRO_CORS_ORIGINS') ?: '';
$corsOrigins = array_values(array_filter(array_map('trim', explode(',', $corsRaw))));

function nominapro_uuid_v4(): string
{
    $b = random_bytes(16);
    $b[6] = chr(ord($b[6]) & 0x0f | 0x40);
    $b[8] = chr(ord($b[8]) & 0x3f | 0x80);
    return sprintf(
        '%08s-%04s-%04s-%04s-%12s',
        bin2hex(substr($b, 0, 4)),
        bin2hex(substr($b, 4, 2)),
        bin2hex(substr($b, 6, 2)),
        bin2hex(substr($b, 8, 2)),
        bin2hex(substr($b, 10, 6))
    );
}

/** @var PDO $pdo */
$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=%s', $dbHost, $dbName, $dbCharset),
    $dbUser,
    $dbPass,
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]
);

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_start();

function nominapro_json(bool $ok, mixed $data = null, ?string $error = null, int $http = 200): void
{
    http_response_code($http);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        $ok
            ? ['ok' => true, 'data' => $data]
            : ['ok' => false, 'error' => $error ?? 'Error'],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

function nominapro_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function nominapro_send_cors(array $allowedOrigins): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && ($allowedOrigins === [] || in_array($origin, $allowedOrigins, true))) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function nominapro_require_user(): array
{
    global $pdo;

    $uid = $_SESSION['user_id'] ?? null;
    if (!is_string($uid) || $uid === '') {
        nominapro_json(false, null, 'No autorizado', 401);
    }
    $st = $pdo->prepare('SELECT id, email FROM users WHERE id = ? LIMIT 1');
    $st->execute([$uid]);
    $row = $st->fetch();
    if (!$row) {
        $_SESSION = [];
        nominapro_json(false, null, 'No autorizado', 401);
    }
    return $row;
}

/** Valid day types matching MySQL ENUM */
const NOMINAPRO_DAY_TYPES = ['full', 'half', 'holiday', 'holiday-worked', 'not-working'];
