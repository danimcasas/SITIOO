<?php
// Private database control; secrets are supplied in this short-lived process environment.
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    $db = new mysqli('127.0.0.1', 'root', getenv('SITIOO_DB_ROOT_PASSWORD'), '', (int)getenv('SITIOO_DB_PORT'));
    $sql = stream_get_contents(STDIN);
    $db->multi_query($sql);
    do {
        if ($result = $db->store_result()) {
            while ($row = $result->fetch_row()) echo json_encode($row, JSON_THROW_ON_ERROR)."\n";
            $result->free();
        }
    } while ($db->more_results() && $db->next_result());
    $db->close();
} catch (Throwable $e) {
    fwrite(STDERR, 'SITIOO: No se pudo completar la operación privada de base de datos. Código '.(int)$e->getCode()."\n");
    exit(1);
}
