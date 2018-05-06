/*global $, template, design, document */

var stylesBuilder = (function () {
    'use strict';

    function getCssParser() {
        return {
            /**
             * Parses CSS rules specified in the content parameter into JSON.
             *
             * Returns only rules with selectors and properties. Ignores
             * comments and additinal css styles.
             *
             * @param {String} content CSS rules to parse.
             * @returns {Array} Array with parsed CSS rules.
             */
            parse : function (content) {
                var clearedContent = this.clearContent(content),
                    result = [],
                    re = /([^{]+)\s*\{\s*([^}]+)\s*\}/g,
                    match;

                while (null !== (match = re.exec(clearedContent))) {
                    result.push({
                        selectors : this.parseSelector(match[1]),
                        properties : this.parseProperties(match[2])
                    });
                }
                result.get = function (criteria, precision, all) {
                    if ('undefined' === typeof precision) {
                        precision = true;
                    }
                    if ('undefined' === typeof all) {
                        all = false;
                    }
                    var items = this.filter(function (item) {
                        return precision ? criteria === item.selectors.join(', ') :
                                -1 !== item.selectors.join(', ').indexOf(criteria);
                    });
                    return (0 === items.length) ? null : (all ? items : items[0]);
                };
                return result;
            },

            /**
             * Parses additinal css rules in the content parameter into string.
             *
             * @param {String} content
             * @returns {String} Content with parsed additinal css rules.
             */
            parseAdditionalCssStyles: function (content) {
                var styles = '';
                content.replace(/\/\* Begin Additional CSS Styles \*\/([\s\S]*)\/\* End Additional CSS Styles \*\//,
                    function (match) {
                        styles = match;
                        return '';
                    });
                return styles;
            },

            /**
             * Removes block comments and additional css styles from the content.
             *
             * Nested comments are not supported.
             *
             * Unit tests: StylesBuilderTests\CssParserTest.js
             *
             * @param {String} content
             * @returns {String} Content without comments and additional css styles.
             */
            clearContent : function (content) {
                return content.replace(/\/\* Begin Additional CSS Styles \*\/([\s\S]*)\/\* End Additional CSS Styles \*\//, '')
                    .replace(/\/\*[^\/]*\*\//g, '');
            },

            /**
             * Parses CSS rule selector into an array.
             *
             * @param {String} selector Selector string, e.g. "html, body, div"
             * @returns {String[]} Array with selectors, e.g. ['html', 'div',
             *                     'a:hover'].
             */
            parseSelector : function (selector) {
                return selector.split(',').map(function (value) {
                    return value.trim();
                });
            },

            /**
             * Parses CSS rule properties into an object.
             *
             * @param {String} properties Properties string, e.g. "color: red;
             *                            font: sans;"
             * @returns {Object} Object with the parsed properties, e.g.
             *                   { color: 'red', font: 'sans' }.
             */
            parseProperties : function (properties) {
                return properties.split(';').filter(function (value) {
                    return '' !== value.trim();
                }).reduce(function (result, value, index) {
                    var parts = value.split(':'), propertyName, propertyValue, currentValue;
                    if (2 === parts.length) {
                        propertyName = parts[0].trim();
                        propertyValue = parts[1].trim();
                        if (result.hasOwnProperty(propertyName)) {
                            currentValue = result[propertyName];
                            if (currentValue instanceof Array) {
                                currentValue.push(propertyValue);
                            } else {
                                currentValue = [currentValue, propertyValue];
                            }
                            propertyValue = currentValue;
                        }
                        result[propertyName] = propertyValue;
                    }
                    return result;
                }, {});
            }
        };
    }

    function getCssPrinter() {
        return {
            /**
             * Returns a string with CSS rules from the given stylesheet, where
             * stylesheet is an array of the parsed CSS rules.
             *
             * @param {Array} stylesheet Array with parsed CSS rules.
             * @returns {String} CSS stylesheet.
             */
            print : function (stylesheet) {

                if ('string' === typeof stylesheet) {
                    return stylesheet;
                }

                var hasOwnProperties = function (obj) {
                    var property;
                    for (property in obj) {
                        if (obj.hasOwnProperty(property)) {
                            return true;
                        }
                    }
                    return false;
                };

                return stylesheet.filter(function (value) {
                    return value.selectors.length > 0 &&
                        hasOwnProperties(value.properties);
                }).reduce(function (result, value) {
                    result.push(value.selectors.join(', '));
                    result.push('{');
                    Object.keys(value.properties).forEach(function (property) {
                        var data = value.properties[property];
                        if ('string' === typeof (data)) {
                            data = [data];
                        }
                        data.forEach(function (value) {
                            result.push('  ' +  property + ': ' + value + ';');
                        });
                    });
                    result.push('}\r\n');
                    return result;
                }, []).join('\r\n');
            }
        };
    }

    /**
     * Returns the default transformer that copies the stylesheet rules.
     */
    function getDefaultTransformer() {
        return {

            /**
             * Converts the given rules into a new ruleset.
             *
             * @param {Array} rules Array with the stylesheet rules.
             * @returns {Array} Array with the stylesheet rules.
             */
            transform : function (rules) {
                return rules.map(function (rule) {
                    return this.transformRule(rule);
                }, this);
            },

            /**
             * Converts the given rule into a new stylesheet rule.
             *
             * @param {Object} rule Object that contains the rule elements:
             *                      selectors and properties.
             * @returns {Array} Object that contains the rule elements.
             */
            transformRule : function (rule) {
                return {
                    selectors : this.transformSelectors(rule.selectors),
                    properties : this.transformProperties(rule.properties)
                };
            },

            /**
             * Converts the given list of selectors.
             *
             * @param {Array} selectors Array that contains stylesheet rule
             *                          selectors.
             * @returns {Array} Array that contains stylesheet rule selectors.
             */
            transformSelectors : function (selectors) {
                return [].concat(selectors);
            },

            /**
             * Converts the given properties.
             *
             * @param {Object} properties Object that contains stylesheet rule
             *                            properties.
             * @returns {Object} Object that contains stylesheet rule
             *                   properties.
             */
            transformProperties : function (properties) {
                return $.extend({}, properties);
            }
        };
    }

    /**
     * Returns the transformer that creates printing stylesheet from
     * the program theme stylesheet.
     *
     * Printing stylesheet is used for printing with B/W printers so
     * all the color information is removed from the rules.
     */
    function getPrintCssTransformer() {
        return $.extend(getDefaultTransformer(), {
            /**
             * Removes the selectors for non-printing elements and collapses
             * the page hierarchy.
             *
             * @param {Array} selectors Array that contains stylesheet rule
             *                          selectors.
             * @returns {Array} Array that contains stylesheet rule selectors.
             */
            transformSelectors : function (selectors) {
                var unnecessary = new RegExp('(' + [ 'slider', 'arrow',
                    'loading', 'close', 'cw', 'ccw', 'preview-cms-logo',
                    'lightbox', 'reset', 'art' ].join('|') + ')'),
                    collapsed = /\.art-postcontent/;

                return selectors.map(function (value) {
                    return value.replace(collapsed, '').trim();
                }).filter(function (value) {
                    return '' !== value && !new RegExp(unnecessary).test(value);
                });
            },
            /**
             * Filters properties that contains color information.
             *
             * @param {Object} properties Object that contains stylesheet rule
             *                            properties.
             * @returns {Object} Object that contains stylesheet rule
             *                   properties.
             */
            transformProperties : function (properties) {
                var result = {}, property;
                for (property in properties) {
                    if (properties.hasOwnProperty(property) &&
                            !(/(border-|color|background-)/).test(property)) {
                        result[property] = properties[property];
                    }
                }
                return result;
            }
        });
    }

    /**
     * Returns the transformer that creates stylesheet for WYSIWYG editors 
     * from the program theme stylesheet.
     */
    function getEditorCssTransformer() {
        return $.extend(getDefaultTransformer(), {
            /**
             * Removes the selectors for elements that are not editable in
             * WYSIWYG editor.
             *
             * @param {Array} selectors Array that contains stylesheet rule
             *      selectors.
             * @returns {Array} Array that contains stylesheet rule selectors.
             */
            transformSelectors : function (selectors) {
                var unnecessary = new RegExp('(' + [ 'slider', 'arrow',
                    'loading', 'close', 'cw', 'ccw', 'preview-cms-logo',
                    'lightbox', 'reset', 'art', '\\.cleared' ].join('|') + ')'),
                    collapsed = new RegExp(/(\.art-postcontent|#art-main)/);
                return selectors.map(function (value) {
                    //special check for art-article div
                    value = value.replace(/^.art-article (\w*)/, 'body $1');
                    return value.replace(collapsed, '').trim() || 'body';
                }).filter(function (value) {
                    return !unnecessary.test(value);
                });
            },

            transformRule : function (rule) {
                var selectors = this.transformSelectors(rule.selectors);
                if (-1 !== selectors.indexOf('body')) {
                    return {
                        selectors : selectors,
                        properties : Object.keys(rule.properties).reduce(
                            function (properties, property) {
                                switch (property) {
                                case 'overflow':
                                case 'position':
                                case 'width':
                                case 'min-width':
                                    break;
                                default:
                                    properties[property] = rule.properties[property];
                                    break;
                                }
                                return properties;
                            },
                            {}
                        )
                    };
                }
                return {
                    selectors : selectors,
                    properties : this.transformProperties(rule.properties)
                };
            },

            getImageData : function (style) {
                var canvas = document.createElement('canvas'),
                    context = canvas.getContext('2d');
                canvas.width = 50;
                canvas.height = 50;
                context.beginPath();
                context.fillStyle = style;
                context.fillRect(0, 0, 50, 50);
                return canvas.toDataURL();
            },

            getUrl : function (rule) {

                if (!rule) {
                    return '';
                }

                var properties = rule.properties, match, str = '', url = '';

                Object.keys(properties).filter(function (value) {
                    return ('background' === value);
                }).forEach(function (property) {
                    var value = properties[property];
                    str = value instanceof Array ?  value[value.length - 1] : value;
                    if (null !== (match = /rgba\([\d\s\.,]+\)/.exec(str))) {
                        url = 'url(' + this.getImageData(match[0]) + ')';
                    } else if (null !== (match = /#[\w\d]+/.exec(str))) {
                        url = 'url(' + this.getImageData(match[0]) + ')';
                    }
                }, this);
                return url;
            },

            buildMultipleBackGrounds : function (content) {

                var stylesheet = getCssParser().parse(content),
                    body = stylesheet.get('#art-main'),
                    urls = [this.getUrl(stylesheet.get('.art-post')), this.getUrl(stylesheet.get('.art-sheet'))]
                        .filter(function (item) { return '' !== item; });

                if (!body) {
                    return stylesheet;
                }
                //creating multiple backgrounds for body of editor
                if (urls.length) {
                    body.properties.background = (function (props) {
                        var backgrounds = props.background instanceof Array ? props.background : [props.background];
                        return backgrounds.reduce(function (result, value, index) {
                            result[index] = urls.join(', ') + ', ' + value;
                            return result;
                        }, []);
                    }(body.properties));

                    if (body.properties['background-attachment']) {
                        body.properties['background-attachment'] =
                            (1 === urls.length ? 'scroll, ' : 'scroll, scroll, ') + body.properties['background-attachment'];
                    }
                }
                return stylesheet;
            },

            prepare : function (content) {
                return this.buildMultipleBackGrounds(content);
            }
        });
    }

    function buildCssFiles(content) {
        var stylesheet = getCssParser().parse(content),
            printer = getCssPrinter();

        return {
            'print.css': printer.print(getPrintCssTransformer()
                .transform(stylesheet)),
            'editor.css': printer.print(getEditorCssTransformer()
                .transform(stylesheet)),
            'custom.css' : printer.print(getCssParser()
                .parseAdditionalCssStyles(content))
        };
    }

    return {
        buildCssFiles : buildCssFiles,
        getDefaultTransformer : getDefaultTransformer,
        getEditorCssTransformer : getEditorCssTransformer,
        getPrintCssTransformer : getPrintCssTransformer,
        getCssPrinter : getCssPrinter,
        getCssParser : getCssParser
    };
}());