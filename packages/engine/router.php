<?php
// Private development server: let PHP resolve real scripts and directory indexes.
$root = realpath($_SERVER['DOCUMENT_ROOT']);
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
$health = getenv('SITIOO_HEALTH_TOKEN');
if ($health && $path === '/.sitioo-health-'.$health) { echo $health; exit; }
if (getenv('SITIOO_PUBLIC_PORT')) $_SERVER['SERVER_PORT'] = getenv('SITIOO_PUBLIC_PORT');
if ($root === false || str_contains($path, "\0")) {
    http_response_code(400);
    exit;
}
$file = realpath($root . $path);
$inside = static fn($value) => $value !== false && ($value === $root || str_starts_with($value, $root . DIRECTORY_SEPARATOR));
if ($inside($file)) {
    if (is_file($file)) {
        return false;
    }
    if (is_dir($file)) {
        foreach (['index.php', 'index.html'] as $index) {
            $target = realpath($file . DIRECTORY_SEPARATOR . $index);
            if ($inside($target) && is_file($target)) {
                // In particular /wp-admin/ must execute wp-admin/index.php.
                return false;
            }
        }
    }
}
// WordPress handles virtual permalinks that do not correspond to physical files.
require $root . '/index.php';
