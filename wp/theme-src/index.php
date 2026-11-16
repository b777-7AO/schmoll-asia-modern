<?php
if (!defined('ABSPATH')) exit;
get_header();
if (is_singular() && have_posts()) {
    the_post();
    // Page bodies are complete HTML sections; print them without the text filters that would alter the markup.
    echo '<main id="main">' . "\n" . do_blocks(get_post()->post_content) . "\n" . '</main>';
} else {
    get_template_part('404-body');
}
get_footer();
