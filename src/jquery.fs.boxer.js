;(function ($, window) {
	"use strict";

	var $body = null,
		data = {},
		trueMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test((window.navigator.userAgent||window.navigator.vendor||window.opera)),
		transitionEvent,
		transitionSupported;

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
				data.$boxer.off(".boxer");
				data.$overlay.trigger("click");
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
			return (typeof this === 'object') ? $(this) : false;
		},

		/**
		 * @method
		 * @name destroy
		 * @description Removes plugin bindings
		 * @example $(".target").boxer("destroy");
		 */
		destroy: function() {
			return $(this).off(".boxer");
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
					sizeContent(data.$content.find(">:first-child"));
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

		$body = $("body");
		transitionEvent = getTransitionEvent();
		transitionSupported = (transitionEvent !== false);

		// no transitions :(
		if (!transitionSupported) {
			transitionEvent = "transitionend.boxer";
		}

		return $(this).on("click.boxer", $.extend({}, options, opts || {}), build);
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
			if ($("#boxer").length > 1 || !(isImage || isVideo || isUrl || isElement || isObject)) {
				return;
			}

			// Kill event
			killEvent(e);

			// Cache internal data
			data = $.extend({}, {
				$window: $(window),
				$body: $("body"),
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
				html += '<div id="boxer-overlay" class="' + data.customClass + '"></div>';
			}
			html += '<div id="boxer" class="loading animating ' + data.customClass;
			if (data.fixed) {
				html += ' fixed';
			}
			if (data.isMobile) {
				html += ' mobile';
			}
			if (isUrl) {
				html += ' iframe';
			}
			if (isElement || isObject) {
				html += ' inline';
			}
			html += '">';
			html += '<span class="boxer-close">' + data.labels.close + '</span>';
			html += '<span class="boxer-loading"></span>';
			html += '<div class="boxer-container">';
			html += '<div class="boxer-content">';
			if (isImage || isVideo) {
				html += '<div class="boxer-meta">';

				if (data.gallery.active) {
					html += '<div class="boxer-control previous">' + data.labels.previous + '</div>';
					html += '<div class="boxer-control next">' + data.labels.next + '</div>';
					html += '<p class="boxer-position"';
					if (data.gallery.total < 1) {
						html += ' style="display: none;"';
					}
					html += '>';
					html += '<span class="current">' + (data.gallery.index + 1) + '</span> ' + data.labels.count + ' <span class="total">' + (data.gallery.total + 1) + '</span>';
					html += '</p>';
					html += '<div class="boxer-caption gallery">';
				} else {
					html += '<div class="boxer-caption">';
				}

				html += data.formatter.apply(data.$body, [data.$target]);
				html += '</div></div>'; // caption, meta
			}
			html += '</div></div></div>'; //container, content, boxer

			// Modify Dom
			data.$body.append(html);

			// Cache jquery objects
			data.$overlay = $("#boxer-overlay");
			data.$boxer = $("#boxer");
			data.$container = data.$boxer.find(".boxer-container");
			data.$content = data.$boxer.find(".boxer-content");
			data.$meta = data.$boxer.find(".boxer-meta");
			data.$position = data.$boxer.find(".boxer-position");
			data.$caption = data.$boxer.find(".boxer-caption");
			data.$controls = data.$boxer.find(".boxer-control");

			data.paddingVertical = (!data.isMobile) ? (parseInt(data.$boxer.css("paddingTop"), 10) + parseInt(data.$boxer.css("paddingBottom"), 10)) : (data.$boxer.find(".boxer-close").outerHeight() / 2);
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
			data.$window.on("resize.boxer", pub.resize)
						.on("keydown.boxer", onKeypress);

			data.$body.on("touchstart.boxer click.boxer", "#boxer-overlay, #boxer .boxer-close", onClose)
					  .on("touchmove.boxer", killEvent);

			if (data.gallery.active) {
				data.$boxer.on("touchstart.boxer click.boxer", ".boxer-control", advanceGallery);
			}

			data.$boxer.on(transitionEvent, function(e) {
				killEvent(e);

				if ($(e.target).is(data.$boxer)) {
					data.$boxer.off(transitionEvent);

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

			$body.addClass("boxer-open");

			if (!transitionSupported) {
				data.$boxer.trigger(transitionEvent);
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
			data.$boxer.on(transitionEvent, function(e) {
				killEvent(e);

				if ($(e.target).is(data.$boxer)) {
					data.$boxer.off(transitionEvent);

					data.$overlay.remove();
					data.$boxer.remove();

					// reset data
					data = {};
				}
			}).addClass("animating");

			$body.removeClass("boxer-open");

			if (!transitionSupported) {
				data.$boxer.trigger(transitionEvent);
			}

			clearTimer(data.resizeTimer);

			// Clean up
			data.$window.off("resize.boxer")
						.off("keydown.boxer");

			data.$body.off(".boxer")
					  .removeClass("boxer-open");

			if (data.gallery.active) {
				data.$boxer.off(".boxer");
			}

			if (data.isMobile) {
				if (data.type === "image" && data.gallery.active) {
					data.$container.off(".boxer");
				}
			}

			data.$window.trigger("close.boxer");
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
			data.$content.on("touchstart.boxer", ".boxer-image", onTouchStart);
		}

		if (data.isMobile || data.fixed) {
			data.$body.addClass("boxer-open");
		}

		data.$boxer.on(transitionEvent, function(e) {
			killEvent(e);

			if ($(e.target).is(data.$boxer)) {
				data.$boxer.off(transitionEvent);

				data.$container.on(transitionEvent, function(e) {
					killEvent(e);

					if ($(e.target).is(data.$container)) {
						data.$container.off(transitionEvent);

						data.$boxer.removeClass("animating");

						data.isAnimating = false;
					}
				});

				data.$boxer.removeClass("loading");

				if (!transitionSupported) {
					data.$content.trigger(transitionEvent);
				}

				data.visible = true;

				// Fire callback + event
				data.callback.apply(data.$boxer);
				data.$window.trigger("open.boxer");

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
			data.$boxer.trigger(transitionEvent);
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
			left: (data.$window.width() - data.contentWidth - data.paddingHorizontal) / 2,
			top: (data.top <= 0) ? ((data.$window.height() - data.contentHeight - data.paddingVertical) / 2) : data.top
		};

		if (data.fixed !== true) {
			pos.top += data.$window.scrollTop();
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
		data.$image = $("<img />");

		data.$image.load(function() {
			data.$image.off("load, error");

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
		  .addClass("boxer-image");

		// If image has already loaded into cache, trigger load event
		if (data.$image[0].complete || data.$image[0].readyState === 4) {
			data.$image.trigger("load");
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

		data.windowHeight = data.viewportHeight = data.$window.height() - data.paddingVertical;
		data.windowWidth  = data.viewportWidth  = data.$window.width()  - data.paddingHorizontal;

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
		data.$videoWrapper = $('<div class="boxer-video-wrapper" />');
		data.$video = $('<iframe class="boxer-video" seamless="seamless" />');

		data.$video.attr("src", source)
				   .addClass("boxer-video")
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
		data.windowHeight = data.viewportHeight = data.contentHeight = data.$window.height() - data.paddingVertical;
		data.windowWidth  = data.viewportWidth  = data.contentWidth  = data.$window.width()  - data.paddingHorizontal;
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

			data.$container.on(transitionEvent, function(e) {
				killEvent(e);

				if ($(e.target).is(data.$container)) {
					data.$container.off(transitionEvent);

					if (typeof data.$image !== 'undefined') {
						data.$image.remove();
					}
					if (typeof data.$videoWrapper !== 'undefined') {
						data.$videoWrapper.remove();
					}
					data.$target = data.gallery.$items.eq(data.gallery.index);

					data.$caption.html(data.formatter.apply(data.$body, [data.$target]));
					data.$position.find(".current").html(data.gallery.index + 1);

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

			data.$boxer.addClass("loading animating");

			if (!transitionSupported) {
				data.$content.trigger(transitionEvent);
			}
		}
	}

	/**
	 * @method private
	 * @name updateControls
	 * @description Updates gallery control states
	 */
	function updateControls() {
		data.$controls.removeClass("disabled");
		if (data.gallery.index === 0) {
			data.$controls.filter(".previous").addClass("disabled");
		}
		if (data.gallery.index === data.gallery.total) {
			data.$controls.filter(".next").addClass("disabled");
		}
	}

	/**
	 * @method private
	 * @name onKeypress
	 * @description Handles keypress in gallery
	 * @param e [object] "Event data"
	 */
	function onKeypress(e) {
		if (data.gallery.active && (e.keyCode === 37 || e.keyCode === 39)) {
			killEvent(e);

			data.$controls.filter((e.keyCode === 37) ? ".previous" : ".next").trigger("click");
		} else if (e.keyCode === 27) {
			data.$boxer.find(".boxer-close").trigger("click");
		}
	}

	/**
	 * @method private
	 * @name cloneElement
	 * @description Clones target inline element
	 * @param id [string] "Target element id"
	 */
	function cloneElement(id) {
		var $clone = $(id).find(">:first-child").clone();
		appendObject($clone);
	}

	/**
	 * @method private
	 * @name loadURL
	 * @description Load URL into iframe
	 * @param source [string] "Target URL"
	 */
	function loadURL(source) {
		source = source + ((source.indexOf("?") > -1) ? "&"+options.requestKey+"=true" : "?"+options.requestKey+"=true");
		var $iframe = $('<iframe class="boxer-iframe" src="' + source + '" />');
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
		data.windowHeight	  = data.$window.height() - data.paddingVertical;
		data.windowWidth	  = data.$window.width() - data.paddingHorizontal;
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
		var $error = $('<div class="boxer-error"><p>Error Loading Resource</p></div>');

		// Clean up
		data.type = "element";
		data.$meta.remove();

		data.$image.off("load, error");

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

			data.$boxer.on("touchmove.boxer", onTouchMove)
					   .one("touchend.boxer", onTouchEnd);
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

		data.$boxer.off("touchmove.boxer touchend.boxer");

		if (data.delta) {
			data.$boxer.addClass("animated");
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
				data.$controls.filter( (data.delta <= data.leftPosition) ? ".previous" : ".next" ).trigger("click");
			}
			startTimer(data.resetTimer, data.duration, function() {
				data.$boxer.removeClass("animated");
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
			test = document.createElement('div');

		for (var type in transitions) {
			if (transitions.hasOwnProperty(type) && type in test.style) {
				return transitions[type];
			}
		}

		return false;
	}

	$.fn.boxer = function(method) {
		if (pub[method]) {
			return pub[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return init.apply(this, arguments);
		}
		return this;
	};

	$.boxer = function($target, opts) {
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