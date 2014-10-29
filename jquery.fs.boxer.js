/* 
 * Boxer v3.3.0 - 2014-10-28 
 * A jQuery plugin for displaying images, videos or content in a modal overlay. Part of the Formstone Library. 
 * http://formstone.it/boxer/ 
 * 
 * Copyright 2014 Ben Plum; MIT Licensed 
 */

;(function ($, window) {
	"use strict";

	var namespace = "boxer",
		$window = null,
		$body = null,
		trueMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test((window.navigator.userAgent||window.navigator.vendor||window.opera)),
		transitionSupported = true,
		data = {},
		classes = {
			overlay: "boxer-overlay",
			base: "boxer",
			close: "boxer-close",
			loading: "boxer-loading-icon",
			container: "boxer-container",
			content: "boxer-content",
			image: "boxer-image",
			video: "boxer-video",
			videoWrapper: "boxer-video-wrapper",
			meta: "boxer-meta",
			control: "boxer-control",
			controlPrevious: "boxer-control-previous",
			controlNext: "boxer-control-next",
			controlDisabled: "boxer-control-disabled",
			position: "boxer-position",
			positionCurrent: "boxer-position-current",
			positionTotal: "boxer-position-total",
			caption: "boxer-caption",
			captionGallery: "boxer-caption-gallery",
			error: "boxer-error",
			isLoading: "boxer-loading",
			isAnimating: "boxer-animating",
			isFixed: "boxer-fixed",
			isMobile: "boxer-mobile",
			isInline: "boxer-inline",
			isIframe: "boxer-iframe",
			isOpen: "boxer-open"
		},
		events = {
			// trigger
			close: "close." + namespace,
			open: "open." + namespace,
			// listen
			click: "click." + namespace,
			keydown: "keydown." + namespace,
			resize: "resize." + namespace,
			load: "load." + namespace,
			touchStartClick: "touchstart." + namespace + " click." + namespace,
			touchStart: "touchstart." + namespace,
			touchMove: "touchmove." + namespace,
			touchEnd: "touchend." + namespace
		};

	/**
	 * @options
	 * @param callback [function] <$.noop> "Funciton called after opening instance"
	 * @param customClass [string] <''> "Class applied to instance"
	 * @param extensions [array] <"jpg", "sjpg", "jpeg", "png", "gif"> "Image type extensions"
	 * @param fixed [boolean] <false> "Flag for fixed positioning"
	 * @param formatter [function] <$.noop> "Caption format function"
	 * @param labels.close [string] <'Close'> "Close button text"
	 * @param labels.count [string] <'of'> "Gallery count separator text"
	 * @param labels.next [string] <'Next'> "Gallery control text"
	 * @param labels.previous [string] <'Previous'> "Gallery control text"
	 * @param margin [int] <50> "Margin used when sizing (single side)"
	 * @param minHeight [int] <100> "Minimum height of modal"
	 * @param minWidth [int] <100> "Minimum width of modal"
	 * @param mobile [boolean] <false> "Flag to force 'mobile' rendering"
	 * @param opacity [number] <0.75> "Overlay target opacity"
	 * @param retina [boolean] <false> "Use 'retina' sizing (half's natural sizes)"
	 * @param requestKey [string] <'boxer'> "GET variable for ajax / iframe requests"
	 * @param top [int] <0> "Target top position; over-rides centering"
	 * @param videoRadio [number] <0.5625> "Video height / width ratio (9 / 16 = 0.5625)"
	 * @param videoWidth [int] <600> "Video target width"
	 */
	var options = {
		callback: $.noop,
		customClass: "",
		extensions: [ "jpg", "sjpg", "jpeg", "png", "gif" ],
		fixed: false,
		formatter: $.noop,
		labels: {
			close: "Close",
			count: "of",
			next: "Next",
			previous: "Previous"
		},
		margin: 50,
		minHeight: 100,
		minWidth: 100,
		mobile: false,
		opacity: 0.75,
		retina: false,
		requestKey: "boxer",
		top: 0,
		videoRatio: 0.5625,
		videoWidth: 600
	};

	/**
	 * @events
	 * @event open.boxer "Modal opened; triggered on window"
	 * @event close.boxer "Modal closed; triggered on window"
	 */

	var pub = {

		/**
		 * @method
		 * @name close
		 * @description Closes active instance of plugin
		 * @example $.boxer("close");
		 */
		close: function() {
			if (typeof data.$boxer !== "undefined") {
				data.$boxer.off( classify(namespace) );
				data.$overlay.triggerHandler(events.click);
			}
		},

		/**
		 * @method
		 * @name defaults
		 * @description Sets default plugin options
		 * @param opts [object] <{}> "Options object"
		 * @example $.boxer("defaults", opts);
		 */
		defaults: function(opts) {
			options = $.extend(options, opts || {});
			return $(this);
		},

		/**
		 * @method
		 * @name destroy
		 * @description Removes plugin bindings
		 * @example $(".target").boxer("destroy");
		 */
		destroy: function() {
			return $(this).off( classify(namespace) );
		},

		/**
		 * @method
		 * @name resize
		 * @description Triggers resize of instance
		 * @example $.boxer("resize");
		 * @param height [int | false] "Target height or false to auto size"
		 * @param width [int | false] "Target width or false to auto size"
		 */
		resize: function(e) {
			if (typeof data.$boxer !== "undefined") {
				if (typeof e !== "object") {
					data.targetHeight = arguments[0];
					data.targetWidth  = arguments[1];
				}

				if (data.type === "element") {
					sizeContent(data.$content.find("> :first-child"));
				} else if (data.type === "image") {
					sizeImage();
				} else if (data.type === "video") {
					sizeVideo();
				}
				size();
			}

			return $(this);
		}
	};

	/**
	 * @method private
	 * @name init
	 * @description Initializes plugin
	 * @param opts [object] "Initialization options"
	 */
	function init(opts) {
		options.formatter = formatCaption;

		$window = $(window);
		$body = $("body");

		events.transition = getTransitionEvent();

		return $(this).on(events.click, $.extend({}, options, opts || {}), build);
	}

	/**
	 * @method private
	 * @name build
	 * @description Builds target instance
	 * @param e [object] "Event data"
	 */
	function build(e) {
		if (typeof data.$boxer === "undefined") {
			// Check target type
			var $target = $(this),
				$object = e.data.$object,
				source = ($target[0].href) ? $target[0].href || "" : "",
				hash = ($target[0].hash) ? $target[0].hash || "" : "",
				sourceParts = source.toLowerCase().split(".").pop().split(/\#|\?/),
				extension = sourceParts[0],
				type = $target.data("boxer-type") || "",
				isImage	= ( (type === "image") || ($.inArray(extension, e.data.extensions) > -1 || source.substr(0, 10) === "data:image") ),
				isVideo	= ( source.indexOf("youtube.com/embed") > -1 || source.indexOf("player.vimeo.com/video") > -1 ),
				isUrl	  = ( (type === "url") || (!isImage && !isVideo && source.substr(0, 4) === "http" && !hash) ),
				isElement  = ( (type === "element") || (!isImage && !isVideo && !isUrl && (hash.substr(0, 1) === "#")) ),
				isObject   = ( (typeof $object !== "undefined") );

			if (isElement) {
				source = hash;
			}

			// Check if boxer is already active, retain default click
			if ( !(isImage || isVideo || isUrl || isElement || isObject) ) {
				return;
			}

			// Kill event
			killEvent(e);

			// Cache internal data
			data = $.extend({}, {
				$target: $target,
				$object: $object,
				visible: false,
				resizeTimer: null,
				touchTimer: null,
				gallery: {
					active: false
				},
				isMobile: (trueMobile || e.data.mobile),
				isAnimating: true,
				oldContentHeight: 0,
				oldContentWidth: 0
			}, e.data);

			// Double the margin
			data.margin *= 2;

			if (isImage) {
				data.type = "image";
			} else if (isVideo) {
				data.type = "video";
			} else {
				data.type = "element";
			}

			if (isImage || isVideo) {
				// Check for gallery
				var id = data.$target.data("gallery") || data.$target.attr("rel"); // backwards compatibility

				if (typeof id !== "undefined" && id !== false) {
					data.gallery.active = true;
					data.gallery.id = id;
					data.gallery.$items = $("a[data-gallery= " + data.gallery.id + "], a[rel= " + data.gallery.id + "]"); // backwards compatibility
					data.gallery.index = data.gallery.$items.index(data.$target);
					data.gallery.total = data.gallery.$items.length - 1;
				}
			}

			// Assemble HTML
			var html = '';
			if (!data.isMobile) {
				html += '<div class="' + [classes.overlay, data.customClass].join(" ") + '"></div>';
			}
			html += '<div class="' + [classes.base, classes.isLoading, classes.isAnimating, data.customClass].join(" ");
			if (data.fixed) {
				html += classes.isFixed;
			}
			if (data.isMobile) {
				html += classes.isMobile;
			}
			if (isUrl) {
				html += classes.isIframe;
			}
			if (isElement || isObject) {
				html += classes.isInline;
			}
			html += '">';
			html += '<span class="' + classes.close + '">' + data.labels.close + '</span>';
			html += '<span class="' + classes.loading + '"></span>';
			html += '<div class="' + classes.container + '">';
			html += '<div class="' + classes.content + '">';
			if (isImage || isVideo) {
				html += '<div class="' + classes.meta + '">';

				if (data.gallery.active) {
					html += '<div class="' + [classes.control, classes.controlPrevious].join(" ") + '">' + data.labels.previous + '</div>';
					html += '<div class="' + [classes.control, classes.controlNext].join(" ") + '">' + data.labels.next + '</div>';
					html += '<p class="' + classes.position + '"';
					if (data.gallery.total < 1) {
						html += ' style="display: none;"';
					}
					html += '>';
					html += '<span class="current">' + (data.gallery.index + 1) + '</span> ' + data.labels.count + ' <span class="total">' + (data.gallery.total + 1) + '</span>';
					html += '</p>';
					html += '<div class="' + [classes.caption, classes.captionGallery].join(" ") + '">';
				} else {
					html += '<div class="' + classes.caption + '">';
				}

				html += data.formatter.apply($window, [data.$target]);
				html += '</div></div>'; // caption, meta
			}
			html += '</div></div></div>'; //container, content, boxer

			// Modify Dom
			$body.append(html);

			// Cache jquery objects
			data.$overlay = $( classify(classes.overlay) );
			data.$boxer = $( classify(classes.base) );
			data.$close = data.$boxer.find( classify(classes.close) );
			data.$container = data.$boxer.find( classify(classes.container) );
			data.$content = data.$boxer.find( classify(classes.content) );
			data.$meta = data.$boxer.find( classify(classes.meta) );
			data.$position = data.$boxer.find( classify(classes.position) );
			data.$caption = data.$boxer.find( classify(classes.caption) );
			data.$controls = data.$boxer.find( classify(classes.control) );

			data.paddingVertical = (!data.isMobile) ? (parseInt(data.$boxer.css("paddingTop"), 10) + parseInt(data.$boxer.css("paddingBottom"), 10)) : (data.$close.outerHeight() / 2);
			data.paddingHorizontal = (!data.isMobile) ? (parseInt(data.$boxer.css("paddingLeft"), 10) + parseInt(data.$boxer.css("paddingRight"), 10)) : 0;
			data.contentHeight = data.$boxer.outerHeight() - data.paddingVertical;
			data.contentWidth = data.$boxer.outerWidth()   - data.paddingHorizontal;
			data.controlHeight = data.$controls.outerHeight();

			// Center
			center();

			// Update gallery
			if (data.gallery.active) {
				updateControls();
			}

			// Bind events
			$window.on(events.resize, pub.resize)
				   .on(events.keydown, onKeydown);

			$body.on(events.touchStartClick, [classify(classes.overlay), classify(classes.close)].join(", "), onClose)
				 .on(events.move, killEvent);

			if (data.gallery.active) {
				data.$boxer.on(events.touchStartClick, classify(classes.control), advanceGallery);
			}

			data.$boxer.on(events.transition, function(e) {
				killEvent(e);

				if ($(e.target).is(data.$boxer)) {
					data.$boxer.off(events.transition);

					if (isImage) {
						loadImage(source);
					} else if (isVideo) {
						loadVideo(source);
					} else if (isUrl) {
						loadURL(source);
					} else if (isElement) {
						cloneElement(source);
					} else if (isObject) {
						appendObject(data.$object);
					} else {
						$.error("BOXER: '" +  source + "' is not valid.");
					}
				}
			});

			$body.addClass(classes.isOpen);

			if (!transitionSupported) {
				data.$boxer.triggerHandler(events.transition);
			}

			if (isObject) {
				return data.$boxer;
			}
		}
	}

	/**
	 * @method private
	 * @name onClose
	 * @description Closes active instance
	 * @param e [object] "Event data"
	 */
	function onClose(e) {
		killEvent(e);

		if (typeof data.$boxer !== "undefined") {
			data.$boxer.on(events.transition, function(e) {
				killEvent(e);

				if ($(e.target).is(data.$boxer)) {
					data.$boxer.off(events.transition);

					data.$overlay.remove();
					data.$boxer.remove();

					// reset data
					data = {};
				}
			}).addClass(classes.isAnimating);

			$body.removeClass(classes.isOpen);

			if (!transitionSupported) {
				data.$boxer.triggerHandler(events.transition);
			}

			clearTimer(data.resizeTimer);

			// Clean up
			$window.off( classify(namespace) );

			$body.off( classify(namespace) )
				 .removeClass(classes.isOpen);

			if (data.gallery.active) {
				data.$boxer.off( classify(namespace) );
			}

			if (data.isMobile) {
				if (data.type === "image" && data.gallery.active) {
					data.$container.off( classify(namespace) );
				}
			}

			$window.trigger(events.close);
		}
	}

	/**
	 * @method private
	 * @name open
	 * @description Opens active instance
	 */
	function open() {
		var position = calculatePosition(),
			durration = data.isMobile ? 0 : data.duration;

		if (!data.isMobile) {
			data.$controls.css({
				marginTop: ((data.contentHeight - data.controlHeight - data.metaHeight) / 2)
			});
		}

		if (!data.visible && data.isMobile && data.gallery.active) {
			data.$content.on(events.start, classify(classes.image), onTouchStart);
		}

		if (data.isMobile || data.fixed) {
			$body.addClass(classes.isOpen);
		}

		data.$boxer.on(events.transition, function(e) {
			killEvent(e);

			if ($(e.target).is(data.$boxer)) {
				data.$boxer.off(events.transition);

				data.$container.on(events.transition, function(e) {
					killEvent(e);

					if ($(e.target).is(data.$container)) {
						data.$container.off(events.transition);

						data.$boxer.removeClass(classes.isAnimating);

						data.isAnimating = false;
					}
				});

				data.$boxer.removeClass(classes.isLoading);

				if (!transitionSupported) {
					data.$content.triggerHandler(events.transition);
				}

				data.visible = true;

				// Fire callback + event
				data.callback.apply(data.$boxer);
				$window.trigger(events.open);

				// Start preloading
				if (data.gallery.active) {
					preloadGallery();
				}
			}
		});

		if (!data.isMobile) {
			data.$boxer.css({
				height: data.contentHeight + data.paddingVertical,
				width:  data.contentWidth  + data.paddingHorizontal,
				top:    (!data.fixed) ? position.top : 0
			});
		}

		// Trigger event in case the content size hasn't changed
		var contentHasChanged = (data.oldContentHeight !== data.contentHeight || data.oldContentWidth !== data.contentWidth);

		if (data.isMobile || !transitionSupported || !contentHasChanged) {
			data.$boxer.triggerHandler(events.transition);
		}

		// Track content size changes
		data.oldContentHeight = data.contentHeight;
		data.oldContentWidth  = data.contentWidth;
	}

	/**
	 * @method private
	 * @name size
	 * @description Sizes active instance
	 */
	function size() {
		if (data.visible && !data.isMobile) {
			var position = calculatePosition();

			data.$controls.css({
				marginTop: ((data.contentHeight - data.controlHeight - data.metaHeight) / 2)
			});

			data.$boxer.css({
				height: data.contentHeight + data.paddingVertical,
				width:  data.contentWidth  + data.paddingHorizontal,
				top:    (!data.fixed) ? position.top : 0
			});
		}
	}

	/**
	 * @method private
	 * @name center
	 * @description Centers instance
	 */
	function center() {
		var position = calculatePosition();

		data.$boxer.css({
			top: (!data.fixed) ? position.top : 0
		});
	}

	/**
	 * @method private
	 * @name calculatePosition
	 * @description Calculates positions
	 * @return [object] "Object containing top and left positions"
	 */
	function calculatePosition() {
		if (data.isMobile) {
			return {
				left: 0,
				top: 0
			};
		}

		var pos = {
			left: ($window.width() - data.contentWidth - data.paddingHorizontal) / 2,
			top: (data.top <= 0) ? (($window.height() - data.contentHeight - data.paddingVertical) / 2) : data.top
		};

		if (data.fixed !== true) {
			pos.top += $window.scrollTop();
		}

		return pos;
	}

	/**
	 * @method private
	 * @name formatCaption
	 * @description Formats caption
	 * @param $target [jQuery object] "Target element"
	 */
	function formatCaption($target) {
		var title = $target.attr("title");
		return (title !== undefined && title.trim() !== "") ? '<p class="caption">' + title.trim() + '</p>' : "";
	}

	/**
	 * @method private
	 * @name loadImage
	 * @description Loads source image
	 * @param source [string] "Source image URL"
	 */
	function loadImage(source) {
		// Cache current image
		data.$image = $("<img>");

		data.$image.on(events.load, function() {
			data.$image.off( classify(namespace) );

			var naturalSize = calculateNaturalSize(data.$image);

			data.naturalHeight = naturalSize.naturalHeight;
			data.naturalWidth  = naturalSize.naturalWidth;

			if (data.retina) {
				data.naturalHeight /= 2;
				data.naturalWidth  /= 2;
			}

			data.$content.prepend(data.$image);

			if (data.$caption.html() === "") {
				data.$caption.hide();
			} else {
				data.$caption.show();
			}

			// Size content to be sure it fits the viewport
			sizeImage();
			open();
		}).error(loadError)
		  .attr("src", source)
		  .addClass(classes.image);

		// If image has already loaded into cache, trigger load event
		if (data.$image[0].complete || data.$image[0].readyState === 4) {
			data.$image.triggerHandler(events.load);
		}
	}

	/**
	 * @method private
	 * @name sizeImage
	 * @description Sizes image to fit in viewport
	 * @param count [int] "Number of resize attempts"
	 */
	function sizeImage() {
		var count = 0;

		data.windowHeight = data.viewportHeight = $window.height() - data.paddingVertical;
		data.windowWidth  = data.viewportWidth  = $window.width()  - data.paddingHorizontal;

		data.contentHeight = Infinity;
		data.contentWidth = Infinity;

		data.imageMarginTop  = 0;
		data.imageMarginLeft = 0;

		while (data.contentHeight > data.viewportHeight && count < 2) {
			data.imageHeight = (count === 0) ? data.naturalHeight : data.$image.outerHeight();
			data.imageWidth  = (count === 0) ? data.naturalWidth  : data.$image.outerWidth();
			data.metaHeight  = (count === 0) ? 0 : data.metaHeight;

			if (count === 0) {
				data.ratioHorizontal = data.imageHeight / data.imageWidth;
				data.ratioVertical   = data.imageWidth  / data.imageHeight;

				data.isWide = (data.imageWidth > data.imageHeight);
			}

			// Double check min and max
			if (data.imageHeight < data.minHeight) {
				data.minHeight = data.imageHeight;
			}
			if (data.imageWidth < data.minWidth) {
				data.minWidth = data.imageWidth;
			}

			if (data.isMobile) {
				// Get meta height before sizing
				data.$meta.css({
					width: data.windowWidth
				});
				data.metaHeight = data.$meta.outerHeight(true);

				// Content match viewport
				data.contentHeight = data.viewportHeight - data.paddingVertical;
				data.contentWidth  = data.viewportWidth  - data.paddingHorizontal;

				fitImage();

				data.imageMarginTop  = (data.contentHeight - data.targetImageHeight - data.metaHeight) / 2;
				data.imageMarginLeft = (data.contentWidth  - data.targetImageWidth) / 2;
			} else {
				// Viewport should match window, less margin, padding and meta
				if (count === 0) {
					data.viewportHeight -= (data.margin + data.paddingVertical);
					data.viewportWidth  -= (data.margin + data.paddingHorizontal);
				}
				data.viewportHeight -= data.metaHeight;

				fitImage();

				data.contentHeight = data.targetImageHeight;
				data.contentWidth  = data.targetImageWidth;
			}

			// Modify DOM

			data.$meta.css({
				width: data.contentWidth
			});

			data.$image.css({
				height: data.targetImageHeight,
				width:  data.targetImageWidth,
				marginTop:  data.imageMarginTop,
				marginLeft: data.imageMarginLeft
			});

			if (!data.isMobile) {
				data.metaHeight = data.$meta.outerHeight(true);
				data.contentHeight += data.metaHeight;
			}

			count ++;
		}
	}

	/**
	 * @method private
	 * @name fitImage
	 * @description Calculates target image size
	 */
	function fitImage() {
		var height = (!data.isMobile) ? data.viewportHeight : data.contentHeight - data.metaHeight,
			width  = (!data.isMobile) ? data.viewportWidth  : data.contentWidth;

		if (data.isWide) {
			//WIDE
			data.targetImageWidth  = width;
			data.targetImageHeight = data.targetImageWidth * data.ratioHorizontal;

			if (data.targetImageHeight > height) {
				data.targetImageHeight = height;
				data.targetImageWidth  = data.targetImageHeight * data.ratioVertical;
			}
		} else {
			//TALL
			data.targetImageHeight = height;
			data.targetImageWidth  = data.targetImageHeight * data.ratioVertical;

			if (data.targetImageWidth > width) {
				data.targetImageWidth  = width;
				data.targetImageHeight = data.targetImageWidth * data.ratioHorizontal;
			}
		}

		// MAX
		if (data.targetImageWidth > data.imageWidth || data.targetImageHeight > data.imageHeight) {
			data.targetImageHeight = data.imageHeight;
			data.targetImageWidth  = data.imageWidth;
		}

		// MIN
		if (data.targetImageWidth < data.minWidth || data.targetImageHeight < data.minHeight) {
			if (data.targetImageWidth < data.minWidth) {
				data.targetImageWidth  = data.minWidth;
				data.targetImageHeight = data.targetImageWidth * data.ratioHorizontal;
			} else {
				data.targetImageHeight = data.minHeight;
				data.targetImageWidth  = data.targetImageHeight * data.ratioVertical;
			}
		}
	}

	/**
	 * @method private
	 * @name loadVideo
	 * @description Loads source video
	 * @param source [string] "Source video URL"
	 */
	function loadVideo(source) {
		data.$videoWrapper = $('<div class="' + classes.videoWrapper + '"></div>');
		data.$video = $('<iframe class="' + classes.video + '" seamless="seamless"></iframe>');

		data.$video.attr("src", source)
				   .addClass(classes.video)
				   .prependTo(data.$videoWrapper);

		data.$content.prepend(data.$videoWrapper);

		sizeVideo();
		open();
	}

	/**
	 * @method private
	 * @name sizeVideo
	 * @description Sizes video to fit in viewport
	 */
	function sizeVideo() {
		// Set initial vars
		data.windowHeight = data.viewportHeight = data.contentHeight = $window.height() - data.paddingVertical;
		data.windowWidth  = data.viewportWidth  = data.contentWidth  = $window.width()  - data.paddingHorizontal;
		data.videoMarginTop = 0;
		data.videoMarginLeft = 0;

		if (data.isMobile) {
			data.$meta.css({
				width: data.windowWidth
			});
			data.metaHeight = data.$meta.outerHeight(true);
			data.viewportHeight -= data.metaHeight;

			data.targetVideoWidth  = data.viewportWidth;
			data.targetVideoHeight = data.targetVideoWidth * data.videoRatio;

			if (data.targetVideoHeight > data.viewportHeight) {
				data.targetVideoHeight = data.viewportHeight;
				data.targetVideoWidth  = data.targetVideoHeight / data.videoRatio;
			}

			data.videoMarginTop = (data.viewportHeight - data.targetVideoHeight) / 2;
			data.videoMarginLeft = (data.viewportWidth - data.targetVideoWidth) / 2;
		} else {
			data.viewportHeight = data.windowHeight - data.margin;
			data.viewportWidth  = data.windowWidth - data.margin;

			data.targetVideoWidth  = (data.videoWidth > data.viewportWidth) ? data.viewportWidth : data.videoWidth;
			if (data.targetVideoWidth < data.minWidth) {
				data.targetVideoWidth = data.minWidth;
			}
			data.targetVideoHeight = data.targetVideoWidth * data.videoRatio;

			data.contentHeight = data.targetVideoHeight;
			data.contentWidth  = data.targetVideoWidth;
		}

		// Update dom

		data.$meta.css({
			width: data.contentWidth
		});

		data.$videoWrapper.css({
			height: data.targetVideoHeight,
			width: data.targetVideoWidth,
			marginTop: data.videoMarginTop,
			marginLeft: data.videoMarginLeft
		});

		if (!data.isMobile) {
			data.metaHeight = data.$meta.outerHeight(true);
			data.contentHeight = data.targetVideoHeight + data.metaHeight;
		}
	}

	/**
	 * @method private
	 * @name preloadGallery
	 * @description Preloads previous and next images in gallery for faster rendering
	 * @param e [object] "Event Data"
	 */
	function preloadGallery(e) {
		var source = '';

		if (data.gallery.index > 0) {
			source = data.gallery.$items.eq(data.gallery.index - 1).attr("href");
			if (source.indexOf("youtube.com/embed") < 0 && source.indexOf("player.vimeo.com/video") < 0) {
				$('<img src="' + source + '">');
			}
		}
		if (data.gallery.index < data.gallery.total) {
			source = data.gallery.$items.eq(data.gallery.index + 1).attr("href");
			if (source.indexOf("youtube.com/embed") < 0 && source.indexOf("player.vimeo.com/video") < 0) {
				$('<img src="' + source + '">');
			}
		}
	}

	/**
	 * @method private
	 * @name advanceGallery
	 * @description Advances gallery base on direction
	 * @param e [object] "Event Data"
	 */
	function advanceGallery(e) {
		killEvent(e);

		var $control = $(this);
		if (!data.isAnimating && !$control.hasClass("disabled")) {
			data.isAnimating = true;

			data.gallery.index += ($control.hasClass("next")) ? 1 : -1;
			if (data.gallery.index > data.gallery.total) {
				data.gallery.index = data.gallery.total;
			}
			if (data.gallery.index < 0) {
				data.gallery.index = 0;
			}

			data.$container.on(events.transition, function(e) {
				killEvent(e);

				if ($(e.target).is(data.$container)) {
					data.$container.off(events.transition);

					if (typeof data.$image !== 'undefined') {
						data.$image.remove();
					}
					if (typeof data.$videoWrapper !== 'undefined') {
						data.$videoWrapper.remove();
					}
					data.$target = data.gallery.$items.eq(data.gallery.index);

					data.$caption.html(data.formatter.apply($body, [data.$target]));
					data.$position.find(classes.positionCurrent).html(data.gallery.index + 1);

					var source = data.$target.attr("href"),
						isVideo = ( source.indexOf("youtube.com/embed") > -1 || source.indexOf("player.vimeo.com/video") > -1 );

					if (isVideo) {
						loadVideo(source);
					} else {
						loadImage(source);
					}
					updateControls();
				}
			});

			data.$boxer.addClass( [classes.isLoading, classes.isAnimating].join(" "));

			if (!transitionSupported) {
				data.$content.triggerHandler(events.transition);
			}
		}
	}

	/**
	 * @method private
	 * @name updateControls
	 * @description Updates gallery control states
	 */
	function updateControls() {
		data.$controls.removeClass(classes.controlDisabled);
		if (data.gallery.index === 0) {
			data.$controls.filter(classes.controlPrevious).addClass(classes.controlDisabled);
		}
		if (data.gallery.index === data.gallery.total) {
			data.$controls.filter(classes.controlNext).addClass(classes.controlDisabled);
		}
	}

	/**
	 * @method private
	 * @name onKeydown
	 * @description Handles keypress in gallery
	 * @param e [object] "Event data"
	 */
	function onKeydown(e) {
		if (data.gallery.active && (e.keyCode === 37 || e.keyCode === 39)) {
			killEvent(e);

			data.$controls.filter((e.keyCode === 37) ? classes.controlPrevious : classes.controlNext).triggerHandler(events.click);
		} else if (e.keyCode === 27) {
			data.$close.triggerHandler(events.click);
		}
	}

	/**
	 * @method private
	 * @name cloneElement
	 * @description Clones target inline element
	 * @param id [string] "Target element id"
	 */
	function cloneElement(id) {
		var $clone = $(id).find("> :first-child").clone();
		appendObject($clone);
	}

	/**
	 * @method private
	 * @name loadURL
	 * @description Load URL into iframe
	 * @param source [string] "Target URL"
	 */
	function loadURL(source) {
		source = source + ((source.indexOf("?") > -1) ? "&" + options.requestKey + "=true" : "?" + options.requestKey + "=true");
		var $iframe = $('<iframe class="' + classes.isIframe + '" src="' + source + '"></iframe>');
		appendObject($iframe);
	}

	/**
	 * @method private
	 * @name appendObject
	 * @description Appends and sizes object
	 * @param $object [jQuery Object] "Object to append"
	 */
	function appendObject($object) {
		data.$content.append($object);
		sizeContent($object);
		open();
	}

	/**
	 * @method private
	 * @name sizeContent
	 * @description Sizes jQuery object to fir in viewport
	 * @param $object [jQuery Object] "Object to size"
	 */
	function sizeContent($object) {
		data.windowHeight	  = $window.height() - data.paddingVertical;
		data.windowWidth	  = $window.width() - data.paddingHorizontal;
		data.objectHeight	  = $object.outerHeight(true);
		data.objectWidth	  = $object.outerWidth(true);
		data.targetHeight	  = data.targetHeight || data.$target.data("boxer-height");
		data.targetWidth	  = data.targetWidth  || data.$target.data("boxer-width");
		data.maxHeight		  = (data.windowHeight < 0) ? options.minHeight : data.windowHeight;
		data.isIframe		  = $object.is("iframe");
		data.objectMarginTop  = 0;
		data.objectMarginLeft = 0;

		if (!data.isMobile) {
			data.windowHeight -= data.margin;
			data.windowWidth  -= data.margin;
		}

		data.contentHeight = (data.targetHeight !== undefined) ? data.targetHeight : (data.isIframe || data.isMobile) ? data.windowHeight : data.objectHeight;
		data.contentWidth  = (data.targetWidth !== undefined)  ? data.targetWidth  : (data.isIframe || data.isMobile) ? data.windowWidth  : data.objectWidth;

		if ((data.isIframe || data.isObject) && data.isMobile) {
			data.contentHeight = data.windowHeight;
			data.contentWidth  = data.windowWidth;
		} else if (data.isObject) {
			data.contentHeight = (data.contentHeight > data.windowHeight) ? data.windowHeight : data.contentHeight;
			data.contentWidth  = (data.contentWidth > data.windowWidth)   ? data.windowWidth  : data.contentWidth;
		}
	}

	/**
	 * @method private
	 * @name loadError
	 * @description Error when resource fails to load
	 * @param e [object] "Event data"
	 */
	function loadError(e) {
		var $error = $('<div class="' + classes.error + '"><p>Error Loading Resource</p></div>');

		// Clean up
		data.type = "element";
		data.$meta.remove();

		data.$image.off( classify(namespace) );

		appendObject($error);
	}

	/**
	 * @method private
	 * @name onTouchStart
	 * @description Handle touch start event
	 * @param e [object] "Event data"
	 */
	function onTouchStart(e) {
		killEvent(e);
		clearTimer(data.touchTimer);

		if (!data.isAnimating) {
			var touch = (typeof e.originalEvent.targetTouches !== "undefined") ? e.originalEvent.targetTouches[0] : null;
			data.xStart = (touch) ? touch.pageX : e.clientX;
			data.leftPosition = 0;

			data.touchMax = Infinity;
			data.touchMin = -Infinity;
			data.edge = data.contentWidth * 0.25;

			if (data.gallery.index === 0) {
				data.touchMax = 0;
			}
			if (data.gallery.index === data.gallery.total) {
				data.touchMin = 0;
			}

			data.$boxer.on(events.touchMove, onTouchMove)
					   .one(events.touchEnd, onTouchEnd);
		}
	}

	/**
	 * @method private
	 * @name onTouchMove
	 * @description Handles touchmove event
	 * @param e [object] "Event data"
	 */
	function onTouchMove(e) {
		var touch = (typeof e.originalEvent.targetTouches !== "undefined") ? e.originalEvent.targetTouches[0] : null;

		data.delta = data.xStart - ((touch) ? touch.pageX : e.clientX);

		// Only prevent event if trying to swipe
		if (data.delta > 20) {
			killEvent(e);
		}

		data.canSwipe = true;

		var newLeft = -data.delta;
		if (newLeft < data.touchMin) {
			newLeft = data.touchMin;
			data.canSwipe = false;
		}
		if (newLeft > data.touchMax) {
			newLeft = data.touchMax;
			data.canSwipe = false;
		}

		data.$image.css({ transform: "translate3D("+newLeft+"px,0,0)" });

		data.touchTimer = startTimer(data.touchTimer, 300, function() { onTouchEnd(e); });
	}

	/**
	 * @method private
	 * @name onTouchEnd
	 * @description Handles touchend event
	 * @param e [object] "Event data"
	 */
	function onTouchEnd(e) {
		killEvent(e);
		clearTimer(data.touchTimer);

		data.$boxer.off( [events.touchMove, events.touchEnd].join("") );

		if (data.delta) {
			data.$boxer.addClass(classes.isAnimating);
			data.swipe = false;

			if (data.canSwipe && (data.delta > data.edge || data.delta < -data.edge)) {
				data.swipe = true;
				if (data.delta <= data.leftPosition) {
					data.$image.css({ transform: "translate3D("+(data.contentWidth)+"px,0,0)" });
				} else {
					data.$image.css({ transform: "translate3D("+(-data.contentWidth)+"px,0,0)" });
				}
			} else {
				data.$image.css({ transform: "translate3D(0,0,0)" });
			}

			if (data.swipe) {
				data.$controls.filter( (data.delta <= data.leftPosition) ? ".previous" : ".next" ).triggerHandler(events.click);
			}
			startTimer(data.resetTimer, data.duration, function() {
				data.$boxer.removeClass(classes.isAnimating);
			});
		}
	}

	/**
	 * @method private
	 * @name calculateNaturalSize
	 * @description Determines natural size of target image
	 * @param $img [jQuery object] "Source image object"
	 * @return [object | boolean] "Object containing natural height and width values or false"
	 */
	function calculateNaturalSize($img) {
		var node = $img[0],
			img = new Image();

		if (typeof node.naturalHeight !== "undefined") {
			return {
				naturalHeight: node.naturalHeight,
				naturalWidth:  node.naturalWidth
			};
		} else {
			if (node.tagName.toLowerCase() === 'img') {
				img.src = node.src;
				return {
					naturalHeight: img.height,
					naturalWidth:  img.width
				};
			}
		}

		return false;
	}

	/**
	 * @method private
	 * @name killEvent
	 * @description Prevents default and stops propagation on event
	 * @param e [object] "Event data"
	 */
	function killEvent(e) {
		if (e.preventDefault) {
			e.stopPropagation();
			e.preventDefault();
		}
	}

	/**
	 * @method private
	 * @name startTimer
	 * @description Starts an internal timer
	 * @param timer [int] "Timer ID"
	 * @param time [int] "Time until execution"
	 * @param callback [int] "Function to execute"
	 */
	function startTimer(timer, time, callback) {
		clearTimer(timer);
		return setTimeout(callback, time);
	}

	/**
	 * @method private
	 * @name clearTimer
	 * @description Clears an internal timer
	 * @param timer [int] "Timer ID"
	 */
	function clearTimer(timer) {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	/**
	 * @method private
	 * @name getTransitionEvent
	 * @description Retuns a properly prefixed transitionend event
	 * @return [string] "Properly prefixed event"
	 */
	function getTransitionEvent() {
		var transitions = {
				'WebkitTransition': 'webkitTransitionEnd',
				'MozTransition':    'transitionend',
				/* 'MSTransitionEnd':  'msTransition', */
				/* 'msTransition':     'MSTransitionEnd' */
				'OTransition':      'oTransitionEnd',
				'transition':       'transitionend'
			},
			event = false,
			test = document.createElement('div');

		for (var type in transitions) {
			if (transitions.hasOwnProperty(type) && type in test.style) {
				event = transitions[type];
			}
		}

		// no transitions :(
		if (!event) {
			event = "transitionend";
			transitionSupported = false;
		}

		return event + classify(namespace);
	}

	/**
	 * @method private
	 * @name classify
	 * @description Create class selector from text
	 * @param text [string] "Text to convert"
	 * @return [string] "New class name"
	 */
	function classify(text) {
		return "." + text;
	}

	$.fn[namespace] = function(method) {
		if (pub[method]) {
			return pub[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return init.apply(this, arguments);
		}
		return this;
	};

	$[namespace] = function($target, opts) {
		if (pub[$target]) {
			return pub[$target].apply(window, Array.prototype.slice.call(arguments, 1));
		} else {
			if ($target instanceof $) {
				return build.apply(window, [{ data: $.extend({
					$object: $target
				}, options, opts || {}) }]);
			}
		}
	};
})(jQuery, window);