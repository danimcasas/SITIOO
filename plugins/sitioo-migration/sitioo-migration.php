<?php
/**
 * Plugin Name: SITIOO Migration
 * Description: Importa las copias numeradas de SITIOO y adapta sus direcciones al hosting de destino.
 * Version: 0.3.0-beta.2
 * Requires at least: 6.0
 * Requires PHP: 8.1
 * Author: danimcasas.com e iNextalent.com
 * Author URI: https://danimcasas.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */
if(!defined('ABSPATH'))exit;
require_once __DIR__.'/includes/importer.php';
add_action('admin_menu',function(){add_management_page('SITIOO Migration','SITIOO Migration','manage_options','sitioo-migration','sitioo_migration_page');});
function sitioo_migration_page(){
    if(!current_user_can('manage_options')||!current_user_can('install_plugins'))wp_die('Necesitas permisos de administrador para migrar.');
    wp_enqueue_script('sitioo-migration',plugins_url('migration.js',__FILE__),[],\Sitioo\VERSION,true);
    wp_localize_script('sitioo-migration','sitiooMigration',['url'=>admin_url('admin-ajax.php'),'nonce'=>wp_create_nonce('sitioo-migrate'),'chunk'=>max(16384,min(524288,(int)(wp_max_upload_size()/4)))]);
    ?>
    <style>#sitioo-confirm[hidden],#sitioo-rollback[hidden],#sitioo-done[hidden]{display:none!important}</style>
    <div class="wrap" style="max-width:900px"><h1>SITIOO Migration <small>0.3.0-beta.2</small></h1>
    <p>Creado por <a href="https://danimcasas.com" target="_blank" rel="noopener">danimcasas.com</a> e <a href="https://iNextalent.com" target="_blank" rel="noopener">iNextalent.com</a>. Software libre · GPL v2 o posterior.</p>
    <p>1. En SITIOO exporta una copia. 2. Selecciona <strong>sitioo-manifest.json y todos sus ZIP de datos</strong>. 3. Comprueba el destino y confirma la importación.</p>
    <p>Solo utiliza copias creadas por ti o de confianza: contienen código de plugins, datos privados y cuentas de WordPress. El administrador con el que has entrado en este hosting se conserva.</p>
    <p>No se sustituye WordPress ni wp-config.php. No se incluyen reglas del servidor, cachés, mu-plugins ni configuración de correo. Revisa estos ajustes al terminar.</p>
    <input type="file" id="sitioo-files" multiple accept=".json,.zip" aria-label="Manifiesto y paquetes de la copia">
    <p><button type="button" class="button button-primary" id="sitioo-upload">Subir y comprobar paquetes</button> <button type="button" class="button" id="sitioo-resume">Consultar o continuar</button></p>
    <div id="sitioo-status" role="status" aria-live="polite" style="white-space:pre-wrap;background:white;padding:20px;border-left:4px solid #6d4aff">Preparado.</div>
    <p id="sitioo-error" role="alert" style="color:#a00;white-space:pre-wrap"></p>
    <p><button type="button" class="button button-primary" id="sitioo-confirm" hidden>Confirmar e importar en este destino</button> <button type="button" class="button" id="sitioo-rollback" hidden>Recuperar el estado anterior</button></p>
    <div id="sitioo-done" hidden><h2>Contenido importado</h2><p>Comprueba la web, los enlaces y los formularios. Los plugins importados están instalados pero inactivos; actívalos desde Plugins después de revisar su compatibilidad, licencias y servicios externos. El tema seleccionado en la copia se conserva.</p><p><a class="button" href="<?php echo esc_url(home_url('/')); ?>" target="_blank" rel="noopener">Abrir web</a> <a class="button" href="<?php echo esc_url(admin_url('plugins.php')); ?>">Revisar plugins</a></p><p>Los originales se conservan en la base de datos y en una carpeta privada del servidor. La recuperación sustituye el estado actual; los cambios realizados después de importar no se conservarían. Esta beta no elimina automáticamente las copias.</p></div></div>
    <?php
}
add_action('wp_ajax_sitioo_migrate',function(){
    if(!current_user_can('manage_options')||!current_user_can('install_plugins'))wp_send_json_error(['message'=>'Se requieren permisos de administrador.'],403);
    if(!check_ajax_referer('sitioo-migrate','nonce',false))wp_send_json_error(['message'=>'La sesión ha caducado. Recarga esta página; el avance se conserva.'],403);
    $lock=null;
    try{
        \Sitioo\check(class_exists('ZipArchive'),'El hosting necesita la extensión PHP ZipArchive.');
        $lock=fopen(\Sitioo\private_root().'/lock','c');\Sitioo\check($lock&&flock($lock,LOCK_EX|LOCK_NB),'Otra operación está en curso. Espera y vuelve a continuar.');
        $op=sanitize_key($_POST['op']??'status');$s=\Sitioo\state_load();
        if($s)\Sitioo\check(hash_equals($s['owner'],wp_get_current_user()->user_login),'La migración pertenece a otro administrador.');
        if($op==='begin'){\Sitioo\check(strlen($_POST['manifest']??'')<=2097152,'El índice es demasiado grande.');$s=\Sitioo\job_begin(json_decode(wp_unslash($_POST['manifest']),true,64,JSON_THROW_ON_ERROR));}
        elseif($op==='upload'){\Sitioo\check($s!==null,'Primero selecciona el manifiesto.');\Sitioo\check(isset($_FILES['chunk'])&&$_FILES['chunk']['error']===UPLOAD_ERR_OK&&is_uploaded_file($_FILES['chunk']['tmp_name']),'La subida supera el límite del hosting o no se ha completado.');\Sitioo\upload_chunk($s,wp_unslash($_POST['name']??''),(int)($_POST['offset']??-1),$_FILES['chunk']['tmp_name']);}
        elseif($op==='step'){\Sitioo\check($s!==null,'No hay una migración pendiente.');\Sitioo\job_step($s);}
        elseif($op==='confirm'){\Sitioo\check(($_POST['confirmed']??'')==='yes'&&$s,'Falta confirmar la sustitución.');\Sitioo\confirm_import($s);}
        elseif($op==='rollback'){\Sitioo\check(($_POST['confirmed']??'')==='yes'&&$s,'Falta confirmar la recuperación.');\Sitioo\rollback_start($s);}
        else \Sitioo\check($op==='status','Acción no reconocida.');
        $result=\Sitioo\public_state($s);flock($lock,LOCK_UN);fclose($lock);$lock=null;wp_send_json_success($result);
    }catch(\Throwable $e){if($lock){flock($lock,LOCK_UN);fclose($lock);}wp_send_json_error(['message'=>$e instanceof \Sitioo\Failure?$e->getMessage():'No se pudo completar esta etapa. El avance se conserva. Revisa los paquetes y el espacio disponible.'],400);}
});
// Keep the migration screen usable even if an imported theme is incompatible.
function sitioo_migration_request(){return (is_admin()&&($_GET['page']??'')==='sitioo-migration') || (wp_doing_ajax()&&($_POST['action']??'')==='sitioo_migrate');}
try{$sitioo_state=\Sitioo\state_load();}catch(\Throwable $e){$sitioo_state=null;}
$sitioo_busy=$sitioo_state&&in_array($sitioo_state['phase'],['tables','import','switch','finish','rollback'],true);
if($sitioo_busy || sitioo_migration_request()){
    add_filter('pre_option_template',fn()=> '__sitioo_migration__');add_filter('pre_option_stylesheet',fn()=> '__sitioo_migration__');
}
if($sitioo_busy)add_action('wp_loaded',function(){if(sitioo_migration_request()&&current_user_can('manage_options'))return;if(($GLOBALS['pagenow']??'')==='wp-login.php')return;status_header(503);header('Retry-After: 120');nocache_headers();wp_die('Estamos actualizando esta web. Vuelve a intentarlo en unos minutos.','Actualización en curso',['response'=>503]);},0);

