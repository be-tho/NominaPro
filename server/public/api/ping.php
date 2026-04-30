<?php

/**
 * Diagnóstico sin base de datos: subilo junto a index.php y abrí
 * https://TU_DOMINIO/api/ping.php
 * Si esto falla con 500, el problema es PHP/hosting antes que NominaPro.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

echo json_encode(
    [
        'ok' => true,
        'php_version' => PHP_VERSION,
        'pdo' => extension_loaded('pdo'),
        'pdo_mysql' => extension_loaded('pdo_mysql'),
    ],
    JSON_UNESCAPED_UNICODE
);
