/*global $, XMLHelper, Placeholders */

/**
 * Contains builders for the template files.
 *
 * @param {Object} options
 */
function TemplateBuilder(options) {
    'use strict';

    this.options = options;

    this.placeholders = new Placeholders({
        get : function (key) {
            // convert key to function name:
            var functionName = key.split('_').reduce(function (name, item) {
                return name + item[0].toUpperCase() + item.slice(1);
            }, 'build');

            // call the function:
            if ('function' === typeof this[functionName]) {
                return this[functionName](this.node, this.content);
            }
            return '';
        }.bind(this)
    });
}

(function () {
    'use strict';

    function phpFilter(content) {
        var php = content.replace(/\$/g, '\\$');
        php = php.replace(/"/g, '\\"');
        php = php.replace(/\n/g, '\\n');
        php = php.replace(/\r/g, '\\r');
        return php;
    }

    TemplateBuilder.prototype.initialize = function (node, fragments, content) {
        this.node = node;
        this.fragments = fragments;
        this.content = content;

        this.placeholders.set(TemplateBuilder.loadFragments(fragments, '/'));
        this.placeholders.set(TemplateBuilder.loadFragments(fragments, '/index'));
        this.placeholders.set(TemplateBuilder.loadFragments(fragments, '/blog/j' + this.options.Version.replace(/\./g, '')));

        this.placeholders.set('menu_show_submenus', $('.art-hmenu>li>ul', node).exists());
        this.placeholders.set('vmenu_show_submenus', $('.art-vmenu>li>ul', node).exists());
        this.placeholders.set('vmenu_simple', false);

        this.placeholders.set('block_has_header', $('.art-block .art-blockheader', node).exists());


        // text direction
        this.placeholders.set('html_dir', (this.options.TextDirection || 'LTR').toLowerCase());

        // positions
        switch (this.options.Positions) {
        case 'natural':
            this.placeholders.set({
                pos_header: 'header',
                pos_extra1: 'extra1',
                pos_extra2: 'extra2',
                pos_user1: 'user1',
                pos_user2: 'user2',
                pos_user3: 'user3',
                pos_user4: 'user4',
                pos_user5: 'user5',
                pos_banner1: 'banner1',
                pos_banner2: 'banner2',
                pos_banner3: 'banner3',
                pos_banner4: 'banner4',
                pos_banner5: 'banner5',
                pos_banner6: 'banner6',
                pos_top1: 'top1',
                pos_top2: 'top2',
                pos_top3: 'top3',
                pos_bottom1: 'bottom1',
                pos_bottom2: 'bottom2',
                pos_bottom3: 'bottom3',
                pos_breadcrumb: 'breadcrumb',
                pos_copyright: 'copyright'
            });
            break;
        case 'numeric':
            // the following numeric associations should not be changed
            // (they match the corresponding positions in Beez template in Joomla 2.5):
            this.placeholders.set({
                pos_user3: 'position-1',
                pos_breadcrumb: 'position-2',
                pos_bottom1: 'position-9',
                pos_bottom2: 'position-10',
                pos_bottom3: 'position-11',
                pos_banner3: 'position-12'
            });
            // the other positions can be changed:
            this.placeholders.set({
                pos_header: 'position-30',
                pos_extra1: 'position-28',
                pos_extra2: 'position-29',
                pos_user1: 'position-20',
                pos_user2: 'position-21',
                pos_user4: 'position-23',
                pos_user5: 'position-24',
                pos_banner1: 'position-15',
                pos_banner2: 'position-19',
                pos_banner4: 'position-22',
                pos_banner5: 'position-25',
                pos_banner6: 'position-26',
                pos_top1: 'position-16',
                pos_top2: 'position-17',
                pos_top3: 'position-18',
                pos_copyright: 'position-27'
            });
            break;
        }

        // headline and slogan
        this.placeholders.set('SiteTitle',
            $('.art-headline a', node).text().replace(/\|/g, '\\|'));

        this.placeholders.set('SiteSlogan',
            $('.art-slogan', node).text().replace(/\|/g, '\\|'));
    };

    /**
     * Creates value for the "post_decorator_body" placeholder.
     *
     * Unit tests: TemplateBuilderTests/BuildPostDecoratorTest.js
     *
     * @param {jQuery} node The node that contains the post.
     * @returns {String}
     */
    TemplateBuilder.prototype.buildPostDecoratorBody = function (node) {
        if (!$('.art-post', node).exists()) {
            return '';
        }

        var placeholders = new Placeholders(this.placeholders),
            post = $('<div>').append(
                XMLHelper.removeWhitespaces(
                    $('.art-post', node).clone().get(0)
                )
            ),
            postHeader,
            postHeaderIcon;

        placeholders.set(TemplateBuilder.loadFragments(this.fragments, '/post'));
        placeholders.set(TemplateBuilder.loadFragments(this.fragments, '/post/j' + this.options.Version.replace(/\./g, '')));

        $('article', post).removeClass('art-article').changeAttr('class',
            function (value) {
                return value + placeholders.create(']]" . $classes . "[[');
            });
        $('.art-postcontent-0', post).removeClass('art-postcontent-0');

        postHeader = $('.art-postheader', post);
        postHeaderIcon = $('.art-postheadericon', postHeader);

        TemplateBuilder.decorate('post_decorator_header',
            $('.art-postheader', post),
            (postHeaderIcon.exists() ? postHeaderIcon : postHeader).html(''));

        TemplateBuilder.decorate('decorator_wrapper',
            $('article', post));

        TemplateBuilder.decorate('post_decorator_metadata_wrapper',
            $('.art-postmetadataheader', post));

        TemplateBuilder.decorate('post_decorator_header_icons',
            $('.art-postheadericons', post).html(''));

        TemplateBuilder.decorate('post_decorator_metadata_wrapper',
            $('.art-postmetadatafooter', post));

        TemplateBuilder.decorate('post_decorator_footer_icons',
            $('.art-postfootericons', post).html(''));

        // Clearing div after the post content prevents from using the decorator method.
        $('.art-postcontent', post).html('').prepend('{post_decorator_content_prepend}').append('{post_decorator_content_append}')
            .before('{post_decorator_content_before}').after('{post_decorator_content_after}');

        return placeholders.replace(post.html())
            .replace(/\[\[([^\]]*)\]\]/g, function (m, key) { return phpFilter(key); });
    };

    /**
     * Creates value for the "block_decorator_body" placeholder.
     *
     * Unit tests: TemplateBuilderTests/BuildBlockDecoratorTest.js
     *
     * @param {jQuery} node The node that contains the block.
     * @returns {String}
     */
    TemplateBuilder.prototype.buildBlockDecoratorBody = function (node) {
        if (!$('.art-block', node).exists()) {
            return '';
        }

        var placeholders = new Placeholders(this.placeholders),
            block = $('<div>').append(XMLHelper.removeWhitespaces($('.art-block', node).clone().get(0)));

        TemplateBuilder.decorate('decorator_wrapper', $('.art-block', block));
        TemplateBuilder.decorate('block_decorator_header', $('.art-blockheader', block), $('h3', block).html(''));
        TemplateBuilder.decorate('block_decorator_content', $('.art-blockcontent', block).html(''));

        // This should be after the ".art-block..." selectors because it changes the class name:
        $('.art-block', block).changeAttr('class', function (value) { return value + placeholders.create(']]" . $classes . "[['); });

        return placeholders.replace(block.html())
            .replace(/\[\[([^\]]*)\]\]/g, function (m, key) { return phpFilter(key); });
    };

    /**
     * Creates value for the "artxVMenu" placeholder.
     *
     * @param {jQuery} node
     * @returns {String}
     */
    TemplateBuilder.prototype.buildVerticalMenuDecorator = function (node) {
        if (!$('.art-vmenublock', node).exists()) {
            return '';
        }

        var placeholders = new Placeholders(this.placeholders),
            menu = $('<div>').append(XMLHelper.removeWhitespaces($('.art-vmenublock', node).clone().get(0)));

        TemplateBuilder.decorate('decorator_wrapper', $('.art-vmenublock', menu));
        TemplateBuilder.decorate('block_decorator_header', $('.art-vmenublockheader', menu), $('h3', menu).html(''));
        TemplateBuilder.decorate('block_decorator_content', $('.art-vmenublockcontent', menu).html(''));

        // This should be after the ".art-vmenublock..." selectors because it changes the class name:
        $('.art-vmenublock', menu).changeAttr('class', function (value) { return value + placeholders.create(']]" . $classes . "[['); });

        placeholders.set('vmenu_decorator_body', placeholders.replace(menu.html())
            .replace(/\[\[([^\]]*)\]\]/g, function (m, key) { return phpFilter(key); }));

        return placeholders.replace(this.placeholders.get('vmenu_decorator_function'));
    };

    TemplateBuilder.prototype.buildContentArticle = function () {
        return this.getDecoratedContentArticle(this.node, 'article');
    };

    TemplateBuilder.prototype.buildContentFrontpageItem = function () {
        return this.getDecoratedContentArticle(this.node, 'frontpage_item');
    };

    TemplateBuilder.prototype.buildJ25ContentArchive = function () {
        return this.getDecoratedContentArticle(this.node, 'archive');
    };

    TemplateBuilder.prototype.buildJ25ContentArticle = function () {
        return this.getDecoratedContentArticle(this.node, 'article');
    };

    TemplateBuilder.prototype.buildJ25ContentListItem = function () {
        return this.getDecoratedContentArticle(this.node, 'list_item');
    };
    
    /**
     * Creates value for the article placeholder.
     *
     * @param {jQuery} node
     * @param {String} contentType Contains article view type.
     *                             For Joomla 1.5: article, frontpage_item.
     *                             For Joomla 2.5: archive, article, list_item.
     */
    TemplateBuilder.prototype.getDecoratedContentArticle =
        function (node, contentType) {
            if (!$('.art-post', node).exists()) {
                return '';
            }

            var placeholders = new Placeholders(this.placeholders),
                post = $(XMLHelper.removeWhitespaces(
                    $('.art-post', node).clone().get(0)
                )),
                contentArticle = '';

            placeholders.set(
                TemplateBuilder.loadFragments(this.fragments, '/post')
            );
            placeholders.set(
                TemplateBuilder.loadFragments(this.fragments, '/post/j' +
                    this.options.Version.replace(/\./g, ''))
            );

            if ($('.art-postheader', post).exists()) {
                contentArticle += '{post_header}';
            }

            if ($('.art-postheadericons', post).exists()) {
                contentArticle += '// Change the order of ""if"" statements to change the order of article metadata header items.\n';

                if ($('.art-postdateicon', post).exists()) {
                    contentArticle += '{post_date_icon}';
                }
                if ($('.art-postauthoricon', post).exists()) {
                    contentArticle += '{post_author_icon}';
                }

                if ('archive' !== contentType) {
                    if ($('.art-postpdficon', post).exists()) {
                        contentArticle += '{post_header_icons_pdf}';
                    }
                    if ($('.art-postprinticon', post).exists()) {
                        contentArticle += '{post_header_icons_print}';
                    }
                    if ($('.art-postemailicon', post).exists()) {
                        contentArticle += '{post_header_icons_email}';
                    }
                    if ($('.art-postediticon', post).exists()) {
                        contentArticle += '{post_header_icons_edit}';
                    }
                }
                contentArticle += '{post_header_icons_tail}';
            }

            if ($('.art-postcontent', post).exists()) {
                contentArticle += '{post_content_' + contentType + '}';
            }

            if ($('.art-postfootericons', post).exists()) {
                contentArticle += '// Change the order of ""if"" statements to change the order of article metadata footer items.\n';
                if ('archive' !== contentType) {
                    if ($('.art-posttagicon', post).exists()) {
                        contentArticle += '{post_tag_icon}';
                    }
                }
                if ($('.art-postcategoryicon', post).exists()) {
                    contentArticle += '{post_category_icon}';
                }
            }

            return placeholders.replace(contentArticle);
        };

    /**
     * Build blog layout.
     *
     * @param {FileManager} result
     * @returns {Boolean}
     */
    TemplateBuilder.prototype.buildBlogPage = function (result, content) {
        var document = $.parseXML(content),
            options = this.options,
            pathComContent = 'html/com_content/',
            index = -1,
            placeholders = this.placeholders,
            blogPage,
            blogPageContent,
            blogPageHtml = '';

        blogPage = $('page[posts_page=\'true\']', document);

        if (!blogPage.exists()) {
            return false;
        }

        blogPageContent = $(blogPage.find('content').text());

        function getPlaceholderKey() {
            index += 1;
            return ('1.5' === options.Version) ? placeholders.create([
                '<?php',
                'if ($this->total > ' + index + '){',
                '   $this->item = &$this->getItem(' + index + ', $this->params);',
                '   echo $this->loadTemplate(\'item\');',
                '}',
                '?>'
            ].join('\n') + '\n') : placeholders.create([
                '<?php',
                'if (isset($this->items[' + index + '])){',
                '   $this->item = &$this->items[' + index + '];',
                '   echo $this->loadTemplate(\'item\');',
                '}',
                '?>'
            ].join('\n') + '\n');
        }

        $.each(blogPageContent, function (i, node) {

            $('article', node).html('');

            if ('article' === node.nodeName.toLowerCase()) {
                blogPageHtml += getPlaceholderKey();
            } else {
                $('.art-content-layout-row>.art-layout-cell', node).html(getPlaceholderKey);
                blogPageHtml += node.outerHTML || '';
            }
        });

        if ('1.5' !== options.version) {
            blogPageHtml = this.placeholders.get('post_create_events_for_all') + '\n' + blogPageHtml;
        }

        result.write(pathComContent + 'category/art_blog.php', blogPageHtml);
        result.write(pathComContent + ('1.5' === options.Version ? 'frontpage'  : 'featured') + '/art_blog.php', blogPageHtml);

        return true;
    };

    /**
     * Creates value for the index.php "head" placeholder.
     *
     * @param {jQuery} node The "html" tag node.
     * @returns {String}
     */
    TemplateBuilder.prototype.buildHead = function (node, content) {
        var contentDoc = $.parseXML(content), head, placeholders, customHeadHtml;

        head = $('head', node.clone());

        if (!head.exists()) {
            return '';
        }

        placeholders = new Placeholders(this.placeholders);

        placeholders.set('templateUrl', '<?php echo $templateUrl; ?>');

        head.find('title,meta[charset]').remove();

        if ($('pages[customHeadHtml]', contentDoc).length > 0) {
            customHeadHtml = $('pages[customHeadHtml]', contentDoc).attr('customHeadHtml');
            if (customHeadHtml) {
                head.prepend(placeholders.create(customHeadHtml));
            }
        }

        head.prepend(placeholders.create([
            '    <jdoc:include type="head" />',
            '    <link rel="stylesheet" href="<?php echo $document->baseurl; ?>/templates/system/css/system.css" />',
            '    <link rel="stylesheet" href="<?php echo $document->baseurl; ?>/templates/system/css/general.css" />'
        ].join('\n') + '\n'));

        head.find('link[href]').each(function (i, e) {
            var href = $(this).attr('href');
            if (/^[^\/:]+\.css$/.test(href)) {
                $(this).attr('href', '{templateUrl}/css/' + href.replace(/style/, 'template'));
            }
        });
        head.contents().filter(function () {
            return this.COMMENT_NODE === this.nodeType && /\="style.ie7.css"/.test(this.nodeValue);
        }).each(function () {
            this.nodeValue = this.nodeValue.replace(/\="style.ie7.css"/, '="{templateUrl}/css/template.ie7.css"');
        });

        head.find('script[src]').each(function (i, e) {
            var src = $(this).attr('src');
            if (/^[^\/:]+\.js$/.test(src)) {
                $(this).attr('src', '{templateUrl}/' + src);
            }
        });

        TemplateBuilder.decorate('jquery_wrapper',
            $('script[src$="jquery.js"]', head)
                .attr('src', '{templateUrl}/jquery.js'));
        script = head.find('script[src$="script.responsive.js"]').length ?
            head.find('script[src$="script.responsive.js"]'):
            head.find('script[src$="script.js"]');
        script.after(
            placeholders.create(
                '\n    <script src="{templateUrl}/modules.js"></script>'
            ),
            placeholders.create(
                '\n    <?php $view->includeInlineScripts() ?>'
            ),
            placeholders.create(
                '\n    <script>if (document._artxJQueryBackup) jQuery = document._artxJQueryBackup;</script>'
            )
        );

        return placeholders.replace(head.html().trim());
    };

    /**
     * Build value for the index.php "body" placeholder.
     *
     * @param {jQuery} node The "html" tag node.
     * @returns {String}
     */
    TemplateBuilder.prototype.buildBody = function (node) {
        var body, placeholders, positionsType;

        body = $('body', node.clone());

        if (!body.exists()) {
            return '';
        }

        placeholders = new Placeholders(this.placeholders);
        positionsType = this.options.Positions;

        body.html(body.html().replace(/\{([a-z0-9_]+)\}/gi, function (match, key) {
            return placeholders.create('[[user_placeholder_' + key + ']]');
        }));

        // Construct Header:
        $('header.art-header', body).prepend(placeholders.create(
            '<?php echo $view->position(\'{pos_header}\', \'art-nostyle\'); ?>'
        ));

        $('header.art-header .art-positioncontrol', body).each(function (i, item) {
            var type = 'numeric' === positionsType ? 'position-' + (i + 31) : 'header' + (i + 1),
                position = placeholders.create('\n<?php echo $view->position(\'' + type + '\', \'art-nostyle\'); ?>');
            $(item).html(position);
        });

        placeholders.set({
            baseurl: '<?php echo $document->baseurl; ?>/',
            templateurl: '<?php echo $templateUrl; ?>/',
            siteTitle: '<?php echo $this->params->get(\'siteTitle\'); ?>',
            siteSlogan: '<?php echo $this->params->get(\'siteSlogan\'); ?>'
        });
        $('.art-headline>a', body).attr('href', '{baseurl}').html('{siteTitle}');
        $('.art-slogan', body).html('{siteSlogan}');
        $('#art-flash-object param[name="movie"]', body).each(function () {
            $(this).attr('value', '{templateurl}' + $(this).attr('value'));
        });
        $('#art-flash-area object[type="application/x-shockwave-flash"]', body).each(function () {
            $(this).attr('data', '{templateurl}' + $(this).attr('data'));
        });
        $('#art-flash-object param[name="flashvars"]', body).each(function () {
            $(this).attr('value', $(this).attr('value')
                .replace(/clip=/, 'clip={templateurl}'));
        });
        $('header img[src]', body).each(function () {
            var img = $(this),
                src = img.attr('src');
            if (-1 === src.search(/^http/)) {
                img.attr('src',  '{templateurl}' + src);
            }
        });
        // Construct Search:
        $('.art-search', body).attr('action', placeholders.create(
            '<?php echo $document->baseurl; ?>/index.php'
        )).attr('method', 'post');
        $('.art-search', body).find('input[type="text"]')
            .attr('name', 'searchword');
        $('.art-search', body).find('input[type="submit"]')
            .before('<input type="hidden" name="task" value="search">\n');
        $('.art-search', body).find('input[type="submit"]')
            .before('<input type="hidden" name="option" value="com_search">\n');

        // Construct Horizontal Menu:
        $('nav', body).before('{hmenu_before}').after('{hmenu_after}');
        $('.art-hmenu', body).replaceWith('{hmenu_prepend}');

        // Construct Layout elements:
        TemplateBuilder.decorate('layout_decorator', $('.art-layout-wrapper', body));

        // * remove content:
        $('.art-content>div[class!="cleared"]', body).remove();
        $('.art-content', body).prepend('{cell_content}');

        // * remove blocks from sidebars:
        $('.art-block', body).remove();

        // * remove vertical menu:
        $('.art-vmenublock', body).remove();

        // * decorate sidebar cells:
        function decorateCell(cell, fragment) {
            cell.before('{' + fragment + '_before}').after('{' + fragment +
                '_after}').prepend('{' + fragment + '_prepend}');
        }

        switch (this.options.Positions) {
        case 'natural':
            if ($('.art-sidebar2', body).exists()) {
                decorateCell($('.art-sidebar1', body), 'cell_left');
                decorateCell($('.art-sidebar2', body), 'cell_right');
            } else {
                if ($('.art-sidebar1 ~ .art-content', node).exists()) {
                    decorateCell($('.art-sidebar1', body), 'cell_left');
                } else {
                    decorateCell($('.art-sidebar1', body), 'cell_right');
                }
            }
            break;
        case 'numeric':
            decorateCell($('.art-sidebar1', body), 'cell_sidebar1');
            decorateCell($('.art-sidebar2', body), 'cell_sidebar2');
            break;
        }

        // Construct Footer:
        (function () {
            var flag,
                content = '',
                position;

            function fixingImagesSrc(content) {
                return content ? content.replace(/src="images\//g, 'src="<?php echo $document->baseurl ?>/templates/<?php echo $document->template; ?>/images/') : content;
            }

            if (!$('footer .art-layout-cell', body).exists()) {
                position = placeholders.create('\n<?php if ($view->containsModules(\'{pos_copyright}\')) : ?>\n' +
                    '    <?php echo $view->position(\'{pos_copyright}\', \'art-nostyle\'); ?>\n' +
                    '<?php else: ?>' +
                    '{html_pos_content}' +
                    '<?php endif; ?>\n');
                if ($('.art-footer-inner', body).exists()) {
                    flag = true;
                    $('.art-footer-inner', body).contents().filter(function () {
                        return (flag = flag && 'art-page-footer' !== $(this).attr('class'));
                    }).each(function (i, item) { content += $(item).outerHTML(); $(item).remove(); });
                    $('.art-footer-inner', body).prepend(position);
                } else if ($('.art-footer .art-page-footer', body).exists()) {
                    flag = true;
                    $('.art-footer', body).contents().filter(function () {
                        return (flag = flag && 'art-page-footer' !== $(this).attr('class'));
                    }).each(function (i, item) { content += $(item).outerHTML(); $(item).remove(); });
                    $('.art-footer', body).prepend(position);
                } else {
                    content = $('footer', body).html();
                    $('footer', body).html(position);
                }
                placeholders.set('html_pos_content', fixingImagesSrc(content));
            } else {
                $('footer .art-layout-cell', body).each(function (i, item) {
                    var countHeaderPositions = $('header.art-header .art-positioncontrol', body).length,
                        type = 'numeric' === positionsType ? 'position-' + (i + 31 + countHeaderPositions) : 'footer' + (i + 1),
                        content = fixingImagesSrc($(item).html());
                    position = placeholders.create('\n<?php if ($view->containsModules(\'' + type + '\')) : ?>\n' +
                        '    <?php echo $view->position(\'' + type + '\', \'art-nostyle\'); ?>\n' +
                        '<?php else: ?>' +
                        content +
                        '<?php endif; ?>\n');
                    $(item).html(position);
                });
            }
        }());

        // Add Debug position:
        body.append(placeholders.create('\n<?php echo $view->position(\'debug\'); ?>'));

        // Delete article content:
        $('article', body).remove();

        return placeholders.replace(body.html());
    };

    /**
     * Build theme manifest: the "templateDetails.xml" file.
     *
     * Unit tests: TemplateBuilderTests/BuildManifestTest.js
     *
     * @param {String} template Template of the templateDetails.xml file.
     * @param {FileManager} result
     * @param {Boolean} blogPageExists
     * @param {jQuery} html
     * @returns {String} Content of the templateDetails.xml file.
     */
    TemplateBuilder.prototype.buildManifest =
        function (template, result, blogPageExists, html) {
            var document, root, addFileName;

            // Later in this function the document reffers not to 
            // global document but to this local document:
            document = $.parseXML(new Placeholders({
                theme : this.options.ThemeName.toLocaleLowerCase()
            }).replace(template));

            root = $(document.documentElement);

            // Set theme metadata info:
            $('name', root).text(this.options.ThemeName);
            $('creationDate', root).text((function (d) {
                return d.getFullYear() + '-' +
                    ('0' + (d.getMonth() + 1)).substr(-2) + '-' +
                    ('0' + d.getDate()).substr(-2);
            }(this.options.TemplateDate)));
            $('version', root).text(this.options.TemplateVersion);
            $('author', root).text(this.options.TemplateAuthor);
            $('authorUrl', root).text(this.options.TemplateAuthorURL);
            $('description', root).text(this.options.TemplateDescription);

            // Remove content loader elements and attributes:
            if (!this.options.includeContent) {
                if ('1.5' === this.options.Version) {
                    $('params', root).removeAttr('addpath');
                    $('param[name="content"]', root).remove();
                } else {
                    $('fields', root).removeAttr('addfieldpath');
                    $('field[name="content"]', root).remove();
                }
            }
            // Remove site title
            if (!$('.art-headline a', html).exists()) {
                $('param[name="siteTitle"],field[name="siteTitle"]', root).remove();
            }
            // Remove site slogan
            if (!$('.art-slogan', html).exists()) {
                $('param[name="siteSlogan"],field[name="siteSlogan"]', root).remove();
            }

            // Remove blog layout type parameter
            if (!blogPageExists) {
                $('param[name="blogLayoutType"],field[name="blogLayoutType"]', root).remove();
            }

            // Create the list of files and folders
            if ('1.5' === this.options.Version) {
                addFileName = function (value) {
                    return !((!this.re || this.re.test(value)) && this.node.append($(document.createElement('filename')).text(value.substr(1))));
                };
                result.enumerateRecursive()
                    .filter(addFileName, {
                        re: /\.css$/i,
                        node: $('css', root)
                    })
                    .filter(addFileName, {
                        re: new RegExp('^/*images/', 'i'),
                        node: $('images', root)
                    })
                    .forEach(addFileName, { node: $('files', root) });
            } else {
                result.enumerate('/').forEach(function (value) {
                    this.node.append($(document.createElement(result.isDirectory('/' + value) ? 'folder' : 'file')).text(value));
                }, { node: $('files', root), result: this.result });
            }

            // Populate positions:
            this.options.TemplatePositions.forEach(function (value) {
                this.append($(document.createElement('position')).text(value));
            }, $('positions', root));

            return XMLHelper.format(document);
        };

    /**
     * Replace placeholders in text files with their values from the "placeholders" object.
     *
     * Unit tests: TemplateBuilderTests/BuildTemplateFilesTest.js
     *
     * @param {FileManager} files
     */
    TemplateBuilder.prototype.buildTemplateFiles = function (files) {
        files.enumerateRecursive()
            .filter(function (path) {
                return files.isFile(path) && !files.isBinary(path) && !files.isGuidBinary(path);
            })
            .forEach(function (path) {
                var content = files.read(path);
                if ('/data/data.xml' !== path) {
                    content = this.placeholders.replace(content);
                    content = content.replace(/\[\[user_placeholder_([a-z0-9_]+)\]\]/gi, function (match, key) {
                        return '{' + key + '}';
                    });
                }
                files.write(path, content);
            }, this);
    };
}());


/**
 * Loads the content of the files within the fragments folder into the returning object.
 *
 *
 * Method may handle two different formats of the fragments:
 * Simple   - All content of the fragment is loaded into the corresponding
 *            placeholder.
 * Combined - When the fragment contains the "&lt;!-- CONTAINER --&gt;...
 *            &lt;!-- /CONTAINER --&gt;" comment then the content before
 *            the opening CONTAINER tag is saved into the placeholder with
 *            the "_before" suffix, the content after the closing CONTAINER tag
 *            is saved into the placeholder with the "_after" suffix.
 *            When the content of the CONTAINER tag contains
 *            the "&lt;-- CONTENT --&gt;" comment the content is split by this
 *            comment into the placeholders with the "_prepend" and "_append" 
 *            suffixes. When the content does not conain the comment, it is
 *            saved into the placeholder with the "_prepend" suffix.
 *
 * Unit tests: TemplateBuilderTests/LoadFragmentsTest.js
 *
 * @param {FileManager} files
 * @param {String} path
 * @returns {Object}
 */
TemplateBuilder.loadFragments = function (files, path) {
    'use strict';

    if (!files.exists(path)) {
        return {};
    }

    return files.enumerate(path).filter(function (value) {
        return this.isFile(path + '/' + value) && !this.isBinary(path + '/' + value) && !this.isGuidBinary(path + '/' + value);
    }, files).reduce(function (fragments, file) {
        var key = file.split('.').shift(),
            value = files.read(path + '/' + file),
            primary = (/([\w\W]*)<!--\s*CONTAINER\s*-->([\w\W]*)<!--\s*\/CONTAINER\s*-->([\w\W]*)/).exec(value),
            secondary;
        if (null === primary) {
            fragments[key] = value;
        } else {
            fragments[key + '_before'] = primary[1];
            fragments[key + '_after'] = primary[3];
            secondary = (/^([\w\W]*)<!--\s*CONTENT\s*-->([\w\W]*)$/).exec(primary[2]);
            if (null === secondary) {
                fragments[key + '_prepend'] = primary[2];
                fragments[key + '_append'] = '';
            } else {
                fragments[key + '_prepend'] = secondary[1];
                fragments[key + '_append'] = secondary[2];
            }
        }
        return fragments;
    }, {});
};

/**
 * Creates a function that resolves an program position to a position in the
 * corresponding position naming schema.
 *
 * Joomla 1.5 does not support numeric position naming schema.
 * 
 * @param {String} version Joomla version: 1.5 or 2.5.
 * @param {String} schema Joomla position naming schema: numeric or natural.
 * @returns {Function}
 */
TemplateBuilder.createPositionResolver = function (version, schema, body) {
    'use strict';

    function createResolver(map) {
        var internal = {};
        Object.keys(map).forEach(function (key) { internal[key] = map[key]; });
        return function (position) {
            return internal[position] || null;
        };
    }

    var map;

    if ($('.art-layout-wrapper', body).exists()) {
        switch ('1.5' === version ? 'natural' : schema) {
        case 'numeric':
            map = {
                'content-before' : { name : 'position-20', style : 'art-post' },
                'content-after' : { name : 'position-23', style : 'art-post' },
                sidebar1 : { name : 'position-7', style : 'art-block' },
                sidebar2 : { name : 'position-6', style : 'art-block' },
                menu : { name : 'position-1', style : 'art-block' },
                footer : { name : 'position-27', style : 'art-nostyle' }
            };
            break;
        case 'natural':
            map = {
                'content-before' : { name : 'user1', style : 'art-post' },
                'content-after' : { name : 'user4', style : 'art-post' },
                menu : { name : 'user3', style : 'art-block' },
                footer : { name : 'copyright', style : 'art-nostyle' }
            };
            if ($('.art-sidebar1', body).exists()) {
                if ($('.art-sidebar2', body).exists()) {
                    map.sidebar1 = { name : 'left', style : 'art-block' };
                    map.sidebar2 = { name : 'right', style : 'art-block' };
                } else if ($('.art-content ~ .art-sidebar1', body).exists()) {
                    map.sidebar1 = { name : 'right', style : 'art-block' };
                } else {
                    map.sidebar1 = { name : 'left', style : 'art-block' };
                }
            }
            break;
        }
        return createResolver(map);
    }
};

/**
 * Builds the list of template positions for a given layout.
 *
 * Unit tests: TemplateBuilderTests/BuildTemplatePositionsTest.js
 *
 * @param {String} positions Either 'numeric' or 'natural'.
 * @param {jQuery|Element} node Node that contains page layout.
 * @returns {String[]} List of template positions.
 */
TemplateBuilder.buildTemplatePositions = function (positions, node) {
    'use strict';

    if (-1 === ['natural', 'numeric'].indexOf(positions)) {
        throw new Error('Argument is our of range.');
    }

    var result = [];

    switch (positions) {
    case 'natural':

        if ($('header', node).exists()) {
            result.push('header');
        }

        if ($('header.art-header .art-positioncontrol').exists()) {
            $('header.art-header .art-positioncontrol').each(function (i, value) {
                result.push('header' + (i + 1));
            });
        }

        if ($('footer .art-layout-cell').exists()) {
            $('footer .art-layout-cell').each(function (i, value) {
                result.push('footer' + (i + 1));
            });
        }
        result.push('breadcrumb', 'banner1', 'banner2', 'banner3', 'banner4',
            'banner5', 'banner6', 'top1', 'top2', 'top3', 'bottom1', 'bottom2',
            'bottom3', 'user1', 'user2', 'user4', 'user5', 'copyright',
            'debug');

        // Horizontal menu adds positions for menu body and two extra positions:
        if ($('.art-hmenu', node).exists()) {
            result.push('user3', 'extra1', 'extra2');
        }

        if ($('.art-sidebar1', node).exists()) {
            if ($('.art-sidebar2', node).exists()) {
                result.push('left', 'right');
            } else {
                result.push($('.art-sidebar1 ~ .art-content', node).exists() ?
                        'left' : 'right');
            }
        }

        result.sort();
        break;
    case 'numeric':

        if ($('header', node).exists()) {
            result.push('position-30');
        }

        if ($('header.art-header .art-positioncontrol').exists()) {
            $('header.art-header .art-positioncontrol').each(function (i, value) {
                result.push('position-' + (i + 31));
            });
        }

        if ($('footer .art-layout-cell').exists()) {
            $('footer .art-layout-cell').each(function (i, value) {
                result.push('position-' + (i + 31 + $('header.art-header .art-positioncontrol').length));
            });
        }

        result.push('position-2', 'position-9', 'position-10', 'position-11',
            'position-12', 'position-15', 'position-16', 'position-17',
            'position-18', 'position-19', 'position-20', 'position-21',
            'position-22', 'position-23', 'position-24', 'position-25',
            'position-26', 'position-27');

        // Horizontal menu adds positions for menu body and two extra positions:
        if ($('.art-hmenu', node).exists()) {
            result.push('position-1', 'position-28', 'position-29');
        }

        if ($('.art-sidebar1', node).exists()) {
            result.push('position-7', 'position-4', 'position-5');
        }
        if ($('.art-sidebar2', node).exists()) {
            result.push('position-6', 'position-8', 'position-3');
        }

        result.sort(function (a, b) {
            // In the following comparison 9 is the length of the 'position-'
            // string:
            return parseInt(a.substr(9), 10) - parseInt(b.substr(9), 10);
        });
        result.unshift('debug');

        break;
    }

    return result;
};

/**
 * Decorates the container by adding the "_append", "_prepend" placeholders and 
 * the content by adding the "_before" and "_after" placeholders.
 *
 * If the container does not have the parent, the before and after placeholder
 * are not added.
 *
 * See the loadFragments() method for more information on how the placholders
 * are loaded.
 *
 * If the content is not set, the method decorates the container.
 *
 * @param {String} name The placeholder base name.
 * @param {jQuery} container The container to wrap with the before/after
 *                           placeholders.
 * @param {jQuery} content The node to add the prepend/append placeholders into.
 *                         If not specified, the container node will be used.
 * @returns {jQuery} The same container that was given.
 */
TemplateBuilder.decorate = function (name, container, content) {
    'use strict';

    (content || container).prepend('{' + name + '_prepend}')
        .append('{' + name + '_append}');

    return container.before('{' + name + '_before}')
        .after('{' + name + '_after}');
};