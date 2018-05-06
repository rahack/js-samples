/*global $, XMLHelper, window */

var SiteContentHandler = (function () {
    'use strict';

    var document = null, file = null, section = null;

    /**
     * Creates a unique alias for the item in the list.
     *
     * Constructs the alias by increasing (or adding) the variable part of
     * the name and checking its existence in the given list. For example, if 
     * the list contains the 'item-1' and 'item-2' elements then the method 
     * should return 'item-3' for 'item-1'.
     *
     * Examples:
     *   List             Name   Result
     *   [item-1, item-2] item   item
     *   [item-1, item-2] item-1 item-3
     *
     * @param {String[]} list
     * @param {String} name
     * @returns {String}
     */
    function buildAlias(list, name) {
        var match, index, base, alias;

        if (-1 === list.indexOf(name)) {
            // There is no need to build an alias.
            return name;
        }

        match = (/\d*$/).exec(name).pop();

        // Base part of the name, e.g. item- for item-12 or item- for item10.
        base = name.substr(0, name.length - match.length);
        if (base.length > 1 && '-' !== base.substr(-1)) {
            base += '-';
        }

        // Variable part of the name, e.g. 12 for item-12.
        index = parseInt(match || '1', 10);

        // Find the alias by incrementing variable part of the name:
        alias = base + index;
        while (-1 !== list.indexOf(alias)) {
            index += 1;
            alias = base + index;
        }
        return alias;
    }

    /**
     * Converts style "url(images/...)" to load images from
     * the "images/template-content/" directory.
     *
     * When a user selects a file to be used as a content cell texture, 
     * the image is copied into the project and added to the content stylesheet
     * as if it were located in the "images" subdirectory of the current article
     * directory.
     *
     * From the content.xml file:
     *   <page title="Subpage 1" ...>
     *     ...
     *     <pageHead>
     *       &lt;style&gt;
     *         .art-content .art-postcontent-0 .layout-item-0 { ... }
     *         .art-content .art-postcontent-0 .layout-item-1 {
     *           ...
     *           background:url('images/358c9.png') top left no-repeat #E2E8EE;
     *          }
     *         .art-content .art-postcontent-0 .layout-item-2 {
     *           ...
     *           background:url('images/f95cf.png') top left no-repeat;
     *         }
     *         .ie7 .post .layout-cell { ... }
     *         .ie6 .post .layout-cell { ... }
     *       &lt;/style&gt;
     *     </pageHead>
     *   </page>
     *
     * @param {String} content
     * @returns {String}
     */
    function convertImageInStylesheet(content) {
        return content.replace(/url\('images\/([\w\d\-\.%]+)'\)/gi,
            function (match, path) {
                return 'url(\'images/template-content/' + path + '\')';
            });
    }

    /**
     * Converts image source attributes to load images from
     * the "images/template-content/" directory.
     *
     * When a user inserts the image into the article content, the image is
     * copied into the project and added to the article as if it were located in
     * the same directory with the article, i.e. the "src" attribute does not
     * contain the path.
     *
     * From the content.xml file:
     *   <content>&lt;img width="..." height="..." alt="" class="art-lightbox"
     *     src="test.png" /&gt;</content>
     *
     * Applying this function modifies the content as follows:
     *   <img width="..." height="..." alt="" class="art-lightbox"
     *     src="images/template-content/test.png" />
     *
     * @param {String} content
     * @returns {String}
     */
    function convertImagesInHtml(content) {
        var ct = convertImageInStylesheet(content);
        return ct.replace(/src="([\w\d\-\.%]+)"/gi,
            function (match, file) {
                return 'src="images/template-content/' + file + '"';
            });
    }

    /**
     * Creates the content document from the template.
     *
     * @param {String} template Template with the content document data.
     * @returns {Object} Content object with methods for adding various
     *                   content types.
     */
    function data(template) {
        var document = $.parseXML(template),
            root = $(document.documentElement);

        function create(name, attrs) {
            return $(document.createElement(name)).attr(attrs || { });
        }

        function createCDATA(text) {
            /**
             * A CDATA section cannot contain the string "]]>" and therefore it 
             * is not possible for a CDATA section to contain nested CDATA sections.
            **/
            var processedText = text.split(']]>').join('\\]\\]>');
            return document.createCDATASection(processedText);
        }

        function find(query) {
            return root.find(query);
        }

        function save() {
            return XMLHelper.format(document);
        }

        function id(list) {
            return find(list).length + 1;
        }

        function list(query, attribute) {
            return $.makeArray(find(query)).map(function (value) {
                return $(value).attr(attribute);
            });
        }

        /**
         * Appends a module to the "modules" collection.
         *
         * Module XML definition:
         *   Element
         *      module
         *   Attributes
         *     id - unique module identifier
         *     title - module title
         *     showTitle - true when the title is visible, false otherwise
         *     position - module position
         *     type - one of the supported module types:
         *       custom - Custom HTML module
         *       login - Login module
         *       menu - Menu module
         *     style - one of the supported styles:
         *       art-nostyle
         *       art-block
         *       art-post
         *       art-vmenu
         */
        function addModule(options, item) {
            var module = create('module', $.extend({
                    id : id('module'),
                    title : '',
                    showTitle : item.attr('showTitle') || 'true'
                }, options)),
                defaultTitle,
                type,
                pageHead = convertImageInStylesheet(item.find('pageHead').text());

            // Writes style tag as html expression
            pageHead = pageHead.replace(/<style>[\s\S]+<\/style>/, function (match) {
                return '<script>document.write(\'' + match.replace(/(\r\n)/g, '').replace(/\'/g, '\\\'') + '\');</script>';
            });

            switch (item.get(0).tagName) {
            case 'block':
                module.append(createCDATA(convertImagesInHtml(
                    (pageHead + '\n' +
                        item.find('content').text()).trim()
                )));
                module.attr({
                    type : 'custom',
                    title : item.attr('title') || 'New Block'
                });
                break;
            case 'widget':
                module.append(createCDATA(convertImagesInHtml(
                    (pageHead + '\n' +
                        item.find('content').text()).trim()
                )));
                type = item.attr('name').split('-')[0];
                defaultTitle = type.charAt(0).toUpperCase() + type.substr(1);
                if ('login' !== type) {
                    type = 'custom';
                }
                module.attr({
                    type : type,
                    title : item.attr('title') || defaultTitle
                });
                break;
            case 'menuWidget':
                module.attr({
                    style: 'art-vmenu',
                    menu: 'ct-vertical-menu',
                    type: 'menu',
                    title: item.attr('title') || 'VMenu'
                });
                break;
            }
            find('modules').append(module);
        }

        /**
         * Creates an article in the specified category for the given site
         * content element.
         * 
         * @param {jQuery} item
         * @param {String} category Either "Articles" or "Featured"
         * @returns {jQuery} Added article node.
         */
        function addPost(item, category) {
            var htmlContent = convertImageInStylesheet(
                    item.find('>pageHead').text().replace(/\.art-postcontent-0/g, '') || ''
                ),
                attrs = { id: id('article') },
                article = null;

            // In Joomla 1.7-2.5 articles should not be empty:
            htmlContent += convertImagesInHtml(item.find('>content').text()) ||
                '<div></div>';
            // Writes style tag as html expression
            htmlContent = htmlContent.replace(/<style>[\s\S]+<\/style>/, function (match) {
                return '<script>document.write(\'' + match.replace(/(\r\n)/g, '').replace(/\'/g, '\\\'') + '\');</script>';
            });
            // TinyMCE editor removes empty <a> tags
            htmlContent = htmlContent.replace(/<a\b[^>]*><\/a>/g, function (match) {
                return match.replace(/>/, '>&nbsp;');
            });
            find('section').each(function () {
                attrs.section = $(this).attr('id');
            });
            attrs.category = find('category[title=\'' + category +
                '\']').attr('id');
            attrs.title = item.attr('title').replace(/\s+/, ' ') || item.attr('caption');
            attrs.alias = buildAlias(list('article', 'alias'), 'article',
                item.attr('name'));
            attrs.path = item.attr('path') || ('/Blog Posts/' + item.attr('name'));
            attrs.description = item.attr('description');
            attrs.keywords = item.attr('keywords');
            article = create('article', attrs).append(createCDATA(htmlContent));
            find('articles').append(article);
            return article;
        }

        /**
         * Creates menu item with the specified type in the specified menu and
         * configures it with the specified layout, parent and article
         * attributes.
         *
         * @param {jQuery} item
         * @param {String} type "hmenu" or "vmenu"
         * @param {String} menu "ct-horizontal-menu" or "ct-vertical-menu" or
         *                      "ct-special-menu"
         * @param {String} layout "category-blog-layout" or "single-article"
         * @param {Numeric} parent
         * @param {Numeric} article
         * @param {Boolean} showTitle
         */
        function createMenuItem(item, type, menu, layout, parent, article, showTitle) {
            var menuItemId = id('menuitem'),
                attrs = {
                    id: menuItemId,
                    menu: menu,
                    title: item.attr('caption'),
                    titleInBrowser: item.attr('titleInBrowser'),
                    alias: 'ct-menu-item-' + menuItemId,
                    path: item.attr('path'),
                    menutype: type,
                    type: layout
                },
                defaultHMenu;

            if (parent) {
                attrs.parent = parent;
            }
            if (article) {
                attrs.article = article;
            }
            if (undefined !== showTitle) {
                attrs.showTitle = showTitle ? 'yes' : 'no';
            }
            attrs.category = find('category[title=\'Featured\']').attr('id');
            defaultHMenu = find('module[title=\'Content / Horizontal Menu\']').length > 0;

            // First menu item should be default:
            if (0 === find('menuitem').length && defaultHMenu) {
                attrs['default'] = '1';
            }
            if (1 === find('menuitem').length && !defaultHMenu) {
                attrs['default'] = '1';
            }

            find('menuitems').append(create('menuitem', attrs));
        }

        /**
         * Create page and menu items for the given site page.
         *
         * @param {jQuery} item Node with the content page.
         */
        function addPage(item) {
            var vParentId = '',
                hParentId = '',
                menuitems = find('menuitems'),
                parent = item.parent().parent().eq(0),
                article = addPost(item, 'Articles'),
                articleLayout = ('true' === item.attr('posts_page') ?
                        'category-blog-layout' : 'single-article'),
                articleId = ('single-article' === articleLayout ?
                        article.attr('id') : ''),
                showTitle;

            if ('site' !== parent.get(0).tagName) {
                hParentId = menuitems.find('menuitem[path=\'' +
                    parent.attr('path') + '\'][menutype=\'hmenu\']').attr('id');
                vParentId = menuitems.find('menuitem[path=\'' +
                    parent.attr('path') + '\'][menutype=\'vmenu\']').attr('id');
            }

            if ('single-article' === articleLayout) {
                showTitle = 'true' === item.attr('showTitle').toLowerCase();
            }

            if ('true' === item.attr('showInHmenu').toLowerCase()) {
                createMenuItem(item, 'hmenu', 'ct-horizontal-menu',
                    articleLayout, hParentId, articleId, showTitle);
            }

            if ('true' === item.attr('showInVmenu').toLowerCase()) {
                createMenuItem(item, 'vmenu', 'ct-vertical-menu', articleLayout,
                    vParentId, articleId, showTitle);
            }
        }

        function addParameter(name, value) {
            var parameter = find('parameters parameter[name=\'' + name + '\']');
            if (parameter.length) {
                parameter.attr('value', value);
                return;
            }
            find('parameters').append(create('parameter', {
                id : id('parameter'),
                name : name,
                value : value
            }));
        }

        return {
            create : create,
            createCDATA : createCDATA,
            find : find,
            save : save,
            id : id,
            list : list,
            addModule : addModule,
            addPost : addPost,
            addPage : addPage,
            addParameter : addParameter,
            createMenuItem : createMenuItem
        };
    }



    /**
     * Creates the data loader file with the program project content.
     *
     * Example:
     *   result.write('/data/data.xml', SiteContentHandler.build(
     *     $('html'), content.read('/content.xml'),
     *     template.read('/data/data.xml'), options.Version, resolver);
     *
     * @param {jQuery} html
     * @param {String} content
     * @param {String} template
     * @param {Object} version Joomla version: 1.5 or 2.5
     * @param {Function} resolver {@link resolver}
     * @returns {String}
     */
    function build(html, content, template, version, positions, resolver) {
        document = $.parseXML(content);
        file = data(template);

        // Configure section for joomla 1.5:
        if ('1.5' === version) {
            section = file.find('section');
        } else {
            file.find('sections').remove();
            file.find('category').removeAttr('section');
        }
        // Create horizontal menu node:
        if ($('.art-hmenu', html).exists()) {
            file.find('modules').append(file.create('module', {
                id: 1,
                title: 'Content / Horizontal Menu',
                showTitle : true,
                position: resolver('menu').name,
                type: 'menu',
                menu: 'ct-horizontal-menu'
            }));
        }
        // Create article nodes:
        $($('post', document).get().reverse()).each(function (value) {
            file.addPost($(this), 'Featured');
        });

        // Create menuitem nodes:
        // Note: returns pages by executing "preorder traversal".
        $('page', document).each(function (value) {
            file.addPage($(this));
        });

        // Create an auxiliary menu:
        var menuItem = $('menuitem', $.parseXML(
            '<menuitem caption="Special Page" name="page" titleInBrowser=""/>'
        ));
        menuItem.attr({caption: 'Special Blog Page', name: 'blog-page'});
        file.createMenuItem(menuItem, 'menu', 'ct-special-menu',
                'category-blog-layout');
        menuItem.attr({ caption: 'Special Single Page', name: 'single-page' });
        file.createMenuItem(menuItem, 'menu', 'ct-special-menu',
                'single-article', null, null, true);

        $('sidebars > sidebar', document).each(function () {
            var item = $(this),
                position = resolver(item.attr('name').toLowerCase()),
                style = 'art-block' === position.style ? '' : 'art-block',
                properties = { position : position.name };
            if ('' !== style) {
                properties.style = style;
            }
            item.children().each(function () {
                file.addModule(properties, $(this));
            });
        });

        (function () {
            if (!$('footer', html).exists()) {
                return;
            }

            function toHtml(set) {
                return $.makeArray(set).map(function (item) {
                    switch (item.nodeType) {
                    case item.ELEMENT_NODE:
                        return item.outerHTML;
                    case item.TEXT_NODE:
                        return item.nodeValue;
                    }
                }).join('').trim();
            }

            var flag, content, module;
            if (!$('footer .art-layout-cell', html).exists()) {
                if ($('.art-footer-inner', html).exists()) {
                    flag = true;
                    content = toHtml($('.art-footer-inner', html).contents()
                        .filter(function () {
                            return (flag = flag &&
                                    'art-page-footer' !== $(this).attr('class'));
                        }));
                } else if ($('.art-footer .art-page-footer', html).exists()) {
                    flag = true;
                    content = toHtml($('.art-footer', html).contents()
                        .filter(function () {
                            return (flag = flag &&
                                    'art-page-footer' !== $(this).attr('class'));
                        }));
                } else {
                    content = $('footer', html).html();
                }

                content = content.replace(/src="images\//g, 'src="images/template/');

                module = {
                    id : file.id('module'),
                    title : 'Footer',
                    showTitle : false,
                    position : resolver('footer').name,
                    type : 'custom'
                };

                if ('art-nostyle' !== resolver('footer').style) {
                    module.style = 'art-nostyle';
                }

                file.find('modules').append(file.create('module', module)
                    .append(file.createCDATA(content)));
            } else {
                $('footer .art-layout-cell', html).each(function (i, item) {
                    var countHeaderPositions = $('header.art-header .art-positioncontrol', html).length,
                        positionName = 'numeric' === positions ? 'position-' + (i + 31 + countHeaderPositions) : 'footer' + (i + 1),
                        content = $(item).html().replace(/src="images\//g, 'src="images/template/');

                    module = {
                        id : file.id('module'),
                        title : 'Footer' + (i + 1),
                        showTitle : false,
                        position : positionName,
                        type : 'custom'
                    };

                    file.find('modules').append(file.create('module', module)
                        .append(file.createCDATA(content)));
                });
            }
        }());

        if ($('.art-headline a', html).exists()) {
            file.addParameter('siteTitle', $('.art-headline a', html).html());
        }
        if ($('.art-slogan', html).exists()) {
            file.addParameter('siteSlogan', $('.art-slogan', html).html());
        }

        return file.save();
    }

    return {
        // Main function:
        build : build,
        // Testing functions requires their references.
        data : data,
        buildAlias : buildAlias,
        convertImageInStylesheet : convertImageInStylesheet,
        convertImagesInHtml : convertImagesInHtml
    };
}());