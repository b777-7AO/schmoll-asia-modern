<?php
/* WPCode "PHP snippet", insertion location on_demand -> "Execute Snippet Now".
   Palette swap for schmoll-asia.com (24.09.2026): hardcoded pure red #FF0000 in
   Elementor documents -> brand red #C11819 (official Schmoll Maschinen red).
   Mirrors what Elementor's own "Replace URL" tool does (str_replace on
   _elementor_data), then flushes Elementor's CSS cache. Set $DRY_RUN=false to write.
   Log written to option claude_color_swap_log. */
global $wpdb;
$DRY_RUN = true;
$from = ['#FF0000', '#ff0000'];
$to   = '#C11819';
$rows = $wpdb->get_results( "SELECT post_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key = '_elementor_data' AND (meta_value LIKE '%#FF0000%' OR meta_value LIKE '%#ff0000%')" );
$log  = [ 'dry_run' => $DRY_RUN, 'when' => current_time( 'mysql' ), 'docs' => [] ];
foreach ( $rows as $r ) {
	$count = substr_count( strtoupper( $r->meta_value ), '#FF0000' );
	$log['docs'][ $r->post_id ] = $count;
	if ( ! $DRY_RUN ) {
		$new = str_replace( $from, $to, $r->meta_value );
		$wpdb->update( $wpdb->postmeta, [ 'meta_value' => $new ], [ 'post_id' => $r->post_id, 'meta_key' => '_elementor_data' ] );
	}
}
if ( ! $DRY_RUN && class_exists( '\Elementor\Plugin' ) ) {
	\Elementor\Plugin::$instance->files_manager->clear_cache();
	$log['css_cache'] = 'cleared';
}
update_option( 'claude_color_swap_log', $log, false );
