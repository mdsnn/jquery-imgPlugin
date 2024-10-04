(function($) {
    // Custom selector for filtering links that point to images
    $.expr[':'].linkingToImage = function(elem) {
        return $(elem).is('a') && elem.href && /\.(gif|jpg|png|bmp|webp)$/i.test(elem.href);
    };

    $.fn.imgPreview = function(optionsOrMethod) {
        // If the method is 'destroy', clean up event listeners
        if (optionsOrMethod === 'destroy') {
            return this.off('mouseenter mouseleave mousemove touchstart touchend');
        }

        // Default settings
        var defaultSettings = {
            imgCSS: {
                transition: 'transform 0.3s ease' // Add smooth transition for scaling
            },
            distanceFromCursor: {
                top: 10,
                left: 10
            },
            position: 'left',
            preloadImages: true,
            onShow: function() {},
            onLoad: function() {},
            onHide: function() {},
            containerID: 'imgPreviewContainer',
            containerLoadingClass: 'loading',
            debounceDelay: 20,
            dynamicResize: true,
            zoomScale: 1.5 // Define the zoom scale (1.5 = 150%)
        };

        var settings = $.extend({}, defaultSettings, optionsOrMethod);
        var $container = $('<div/>', { 
            id: settings.containerID, 
            role: 'dialog', 
            'aria-live': 'polite' 
        }).append('<img/>').hide().appendTo('body');

        var $img = $('img', $container).css(settings.imgCSS);
        var cache = {};

        // Loading CSS for the container with transitions
        $('<style>')
            .prop('type', 'text/css')
            .html(`
                #${settings.containerID} {
                    position: absolute;
                    z-index: 1000;
                    background: white;
                    border: 1px solid #ccc;
                    padding: 10px;
                    transition: opacity 0.2s ease, transform 0.2s ease; /* Smooth transitions */
                    opacity: 0; /* Start hidden */
                    transform: scale(0.9); /* Slightly scale down */
                }
                #${settings.containerID}.visible {
                    opacity: 1; /* Fully visible */
                    transform: scale(1); /* Scale to original size */
                }
                #${settings.containerID} img:hover {
                    transform: scale(${settings.zoomScale}); /* Zoom-in effect on hover */
                }
            `).appendTo('head');

        // Preload images if the option is enabled
        if (settings.preloadImages) {
            this.each(function() {
                if ($(this).is(':linkingToImage')) {
                    $('<img/>')[0].src = this.href; 
                }
            });
        }

        // Debounce the mousemove event
        let debounceTimer;
        const calculatePosition = function(e) {
            let top, left;
            switch (settings.position) {
                case 'top':
                    top = e.pageY - $container.outerHeight() - settings.distanceFromCursor.top;
                    left = e.pageX + settings.distanceFromCursor.left;
                    break;
                case 'bottom':
                    top = e.pageY + settings.distanceFromCursor.top;
                    left = e.pageX + settings.distanceFromCursor.left;
                    break;
                case 'left':
                    top = e.pageY + settings.distanceFromCursor.top;
                    left = e.pageX - $container.outerWidth() - settings.distanceFromCursor.left;
                    break;
                case 'right':
                default:
                    top = e.pageY + settings.distanceFromCursor.top;
                    left = e.pageX + settings.distanceFromCursor.left;
                    break;
            }

            const windowWidth = $(window).width();
            const windowHeight = $(window).height();

            // Prevent preview from going off-screen
            if (top < 0) {
                top = 0;
            } else if (top + $container.outerHeight() > windowHeight) {
                top = windowHeight - $container.outerHeight();
            }

            if (left < 0) {
                left = 0;
            } else if (left + $container.outerWidth() > windowWidth) {
                left = windowWidth - $container.outerWidth();
            }

            return { top, left };
        };

        // Set up mousemove and hover events for image preview
        this.filter(':linkingToImage')
            .on('mousemove', function(e) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const pos = calculatePosition(e);
                    $container.css({
                        top: pos.top + 'px',
                        left: pos.left + 'px'
                    });
                }, settings.debounceDelay);
            })
            .hover(function() {
                const link = this;

                // Show loading state
                $container.addClass(settings.containerLoadingClass).fadeIn(200);

                $img.off('load error').on('load', function() {
                    cache[link.href] = link.href; // Cache the image on load
                    $container.removeClass(settings.containerLoadingClass);
                    $img.stop(true).css({ opacity: 0 }).animate({ opacity: 1 }, 200);
                    $container.addClass('visible');
                    settings.onLoad.call($img[0], link);
                }).on('error', function() {
                    $img.attr('src', 'path/to/default-image.jpg'); // Set default image on error
                }).attr('src', link.href);

                settings.onShow.call($container[0], link);
            }, function() {
                $img.stop(true).animate({ opacity: 0 }, 200, function() {
                    $container.removeClass('visible');
                    setTimeout(() => {
                        $container.fadeOut(200);
                    }, 200);
                });
                $img.off('load error').attr('src', '');
                settings.onHide.call($container[0], this);
            })
            .on('focus', function() {
                const link = this;
                $container.fadeIn(200);
                $img.attr('src', link.href);
            })
            .on('blur', function() {
                $container.fadeOut(200);
                $img.attr('src', '');
            });

        // Touch support for mobile devices
        this.filter(':linkingToImage')
            .on('touchstart', function() {
                const link = this;
                $container.fadeIn(200);
                $img.attr('src', link.href);
            })
            .on('touchend', function() {
                $container.fadeOut(200);
                $img.attr('src', '');
            });

        // Dynamic resizing based on screen size
        if (settings.dynamicResize) {
            $(window).on('resize', function() {
                const screenWidth = $(this).width();
                if (screenWidth < 768) {
                    $img.css({ width: '150px' });
                } else {
                    $img.css({ width: '300px' });
                }
            }).trigger('resize');
        }

        return this; 
    };
})(jQuery);

// Usage example
$('a').imgPreview({
    imgCSS: {
        width: 200,
        transition: 'transform 0.3s ease' // Add smooth transition for scaling
    },
    onShow: function() {
        $('img', this).css({ opacity: 0 });
    },
    onLoad: function() {
        $(this).animate({ opacity: 1 }, 400);
    },
    position: 'left',
    distanceFromCursor: {
        left: 20,
        top: 10
    },
    debounceDelay: 20,
    dynamicResize: true, // Enable dynamic resizing based on screen size
    zoomScale: 1.5 // Add zoom-in effect
});