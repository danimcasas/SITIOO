<?php
// Trusted desktop adapter. It reuses format 1 and never starts the imported web.
if (!defined('WP_CLI') || !WP_CLI) exit(1);
try {
    $library = getenv('SITIOO_MIGRATION_LIB');
    if (!$library) throw new RuntimeException('Missing migration library');
    if (!defined('SITIOO_PRIVATE_DIR')) define('SITIOO_PRIVATE_DIR', getenv('SITIOO_PRIVATE_DIR'));
    require_once $library.'/importer.php';
    $request = \Sitioo\json_read($args[0]);
    $source = realpath($request['source'] ?? '');
    \Sitioo\check($source && is_dir($source), 'No se encuentra la copia preparada.');
    \Sitioo\check(get_current_user_id() > 0 && current_user_can('manage_options'), 'No se pudo preparar el administrador.');
    $manifest = \Sitioo\json_read($source.'/sitioo-manifest.json');
    \Sitioo\job_begin($manifest);
    $state = \Sitioo\state_load();
    foreach ($manifest['packages'] as $package) {
        $file = $source.'/'.$package['name'];
        \Sitioo\check(is_file($file) && !is_link($file) && filesize($file) === $package['bytes'] &&
            hash_file('sha256', $file) === $package['sha256'], 'Un paquete está incompleto o ha cambiado.');
        $target = \Sitioo\current_job().'/packages/'.$package['name'];
        \Sitioo\check(!file_exists($target) && copy($file, $target), 'No se pudo preparar un paquete.');
        chmod($target, 0600);
        $state['uploaded'][$package['name']] = $package['bytes'];
    }
    \Sitioo\state_save($state);
    $limit = 32 + count($manifest['tables']) + 4 * count($manifest['packages']);
    foreach ($manifest['packages'] as $package) $limit += $package['entries'];
    for ($step = 0; $state['phase'] !== 'complete' && $step < $limit; $step++) {
        if ($state['phase'] === 'ready') \Sitioo\confirm_import($state);
        else \Sitioo\job_step($state);
    }
    \Sitioo\check($state['phase'] === 'complete', 'La recuperación no terminó.');
    echo "SITIOO_LOCAL_IMPORT_OK\n";
} catch (\Throwable $error) {
    // Neither SQL nor package contents or credentials are included in desktop logs.
    WP_CLI::error('SITIOO: No se pudo recuperar la copia. Se conservan los archivos para diagnóstico.');
}
