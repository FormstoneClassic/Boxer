/*
 * Boxer [Formstone Library]
 * @author Ben Plum
 * @version 1.8.5
 *
 * Copyright © 2013 Ben Plum <mr@benplum.com>
 * Released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
 */
 
if (jQuery) (function($) {
	
	// Default Options
	var options = {
		callback: $.noop,
		customClass: "",
		duration: 250,
		fixed: false,
		formatter: $.noop,
		height: 100,
		margin: 100,
		minHeight: 100,
		minWidth: 100,
		mobile: false,
		opacity: 0.75,
		retina: false,
		requestKey: "boxer",
		top: 0,
		videoRatio: 9 / 16,
		videoWidth: 600,
		width: 100
	};
	// Internal Data
	var data = {};
	
	// Mobile Detect
	var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test( (navigator.userAgent||navigator.vendor||window.opera) );
	
	// Public Methods
	var pub = {
		
		destroy: function() {
			_close();
			return $(this).off(".boxer");
		},
		
		resize: function(e /* , height, width */) { 
			// removing custom size support - will return later
			if (typeof data.$boxer != "undefined") {
				if (data.type == "element") {
					_sizeContent(data.$content.find(">:first-child"));
				} else if (data.type == "image") {
					_sizeImage(0);
				} else if (data.type == "video") {
					_sizeVideo();
				}
				_size();
			}
			
			return $(this);
		}
	};
	
	// Initialize
	function _init(opts) {
		options.formatter = _formatCaption;
		return $(this).on("click.boxer", $.extend({}, options, opts || {}), _build);
	}
	
	// Build Boxer
	function _build(e) {
		e.preventDefault();
		e.stopPropagation();
		
		// Check target type
		var $target = $(this),
			$object = e.data.$object,
			source = ($target[0].attributes) ? $target.attr("href") || "" : "",
			checkExt = source.toLowerCase().split("."),
			extension = checkExt[ checkExt.length - 1 ],
			type = $target.data("type") || "";
		
		var isImage    = ( (type == "image") || (extension == "jpeg" || extension == "jpg" || extension == "gif" || extension == "png" || source.substr(0, 10) == "data:image") ),
			isVideo    = ( source.indexOf("youtube.com/embed") > -1 || source.indexOf("player.vimeo.com/video") > -1 ),
			isUrl 		= ( (type == "url") || (!isImage && !isVideo && source.substr(0, 4) == "http") ),
			isElement  = ( (type == "element") || (!isImage && !isVideo && !isUrl && source.substr(0, 1) == "#") ),
			isObject   = ( (typeof $object !== "undefined") );
		
		// Check if one already exists
		if ($("#boxer").length < 1 && (isImage || isVideo || isUrl || isElement || isObject)) {
			// Cache internal data
			data = {
				$target: $target,
				$object: $object,
				visible: false,
				resizeTimer: null,
				touchTimer: null,
				gallery: {
					active: false
				},
				options: e.data,
				isMobile: ((isMobile || e.data.mobile) /* && !isUrl */ && !isElement && !isObject)
			};
			
			if (isImage) {
				data.type = "image";
			} else if (isVideo) {
				data.type = "video";
			} else {
				data.type = "element";
			}
			
			if (isImage || isVideo) {
				// Check for gallery
				var rel = data.$target.attr("rel");
				if (typeof rel !== "undefined" && rel !== false) {
					data.gallery.active = true;
					data.gallery.rel = rel;
					data.gallery.$items = $("a[rel= " + data.gallery.rel + "]");
					data.gallery.index = data.gallery.$items.index(data.$target);
					data.gallery.total = data.gallery.$items.length - 1;
				}
			}
			
			// Assemble HTML
			var html = '';
			if (!data.isMobile) {
				html += '<div id="boxer-overlay" class="' + data.options.customClass + '" style="opacity: 0"></div>';
			}
			html += '<div id="boxer" class="' + data.options.customClass;
			if (data.isMobile) {
				html += ' mobile';
			}
			if (isUrl) {
				html += ' iframe';
			}
			if (isElement || isObject) {
				html += ' inline';
			}
			html += '" style="opacity: 0;';
			if (data.options.fixed === true) {
				html += ' position: fixed;'
			}
			html += '">';
			html += '<span class="boxer-close">Close</span>';
			html += '<div class="boxer-container" style="'
			if (data.isMobile) {
				html += 'height: 100%; width: 100%';
			} else {
				html += 'height: ' + data.options.height + 'px; width: ' + data.options.width + 'px';
			}
			html += '">';
			html += '<div class="boxer-content" style="opacity: 0;">';
			if (isImage || isVideo) {
				html += '<div class="boxer-meta">';
				
				if (data.gallery.active) {
					html += '<div class="boxer-arrow previous">Previous</div>';
					html += '<div class="boxer-arrow next">Next</div>';
					html += '<p class="boxer-position"';
					if (data.gallery.total < 1) { 
						html += ' style="display: none;"'; 
					}
					html += '>';
					html += '<span class="current">' + (data.gallery.index + 1) + '</span> of <span class="total">' + (data.gallery.total + 1) + '</span>';
					html += '</p>';
					html += '<div class="boxer-caption gallery">';
				} else {
					html += '<div class="boxer-caption">';
				}
				
				html += data.options.formatter.apply($("body"), [data.$target]);
				html += '</div></div>'; // caption, meta
			}
			html += '</div></div></div>'; //container, content, boxer
			
			// Modify Dom
			$("body").append(html);
			
			// Cache jquery objects
			data.$overlay = $("#boxer-overlay");
			data.$boxer = $("#boxer");
			data.$container = data.$boxer.find(".boxer-container");
			data.$content = data.$boxer.find(".boxer-content");
			data.$meta = data.$boxer.find(".boxer-meta");
			data.$position = data.$boxer.find(".boxer-position");
			data.$caption = data.$boxer.find(".boxer-caption");
			data.$arrows = data.$boxer.find(".boxer-arrow");
			data.$animatables = $("#boxer-overlay, #boxer, .boxer-container");
			data.padding = parseInt(data.$boxer.css("paddingTop"), 10) * 2;
			
			// Center / update gallery
			_center();
			if (data.gallery.active) {
				_updatePagination();
			}
			
			// Bind events
			$(window).on("resize.boxer", _resize)
					 .on("keydown.boxer", _keypress);
			$("body").on("click.boxer", "#boxer-overlay, #boxer .boxer-close", _close);
			if (data.gallery.active) {
				data.$boxer.on("click.boxer", ".boxer-arrow", _advanceGallery);
			}
			
			data.$overlay.stop().animate({ opacity: data.options.opacity }, data.options.duration);
			data.$boxer.stop().animate({ opacity: 1 }, data.options.duration, function() { 
				if (isImage) {
					_loadImage(source);
				} else if (isVideo) {
					_loadVideo(source);
				} else if (isUrl) {
					_loadURL(source);
				} else if (isElement) {
					_cloneElement(source);
				} else if (isObject) {
					_appendObject(data.$object);
				} else {
					$.error("BOXER: '" +  source + "' is not valid.");
				}
			});
		}
		if (isObject) {
			return data.$boxer;
		}
	}
	
	// Open boxer
	function _open() {
		if (data.isMobile) {
			var newLeft = 0;
				newTop = 0;
		} else {
			var newLeft = ($(window).width() - data.contentWidth - data.padding) / 2,
				newTop = (data.options.top <= 0) ? (($(window).height() - data.contentHeight - data.padding) / 2) : data.options.top,
				arrowHeight = data.$arrows.outerHeight();
			
			if (data.options.fixed !== true) {
				newTop += $(window).scrollTop();
			}
			
			data.$arrows.css({ 
				marginTop: ((data.contentHeight - data.metaHeight - arrowHeight) / 2) 
			});
		}
		
		var durration = data.isMobile ? 0 : data.options.duration;
		
		//
		if (!data.visible && data.isMobile) {
			$("html, body").css({ height: "100%", overflow: "hidden", width: "100%" });
			
			if (data.type == "image" && data.gallery.active) {
				data.$content.on("touchstart.boxer", ".boxer-image", _touchStart);
			}
		}
		
		data.$boxer.stop().animate({ left: newLeft, top: newTop }, durration);
		data.$container.show().stop().animate({ height: data.contentHeight, width: data.contentWidth }, durration, function(e) {
			data.$content.stop().animate({ opacity: 1 }, data.options.duration);
			data.$boxer.find(".boxer-close").stop().animate({ opacity: 1 }, data.options.duration);
			
			// Fire callback
			data.options.callback.apply(data.$boxer);
			
			data.visible = true;
		});
	}
	
	// Size Boxer
	function _size(animate) {
		animate = animate || false;
		
		if (data.visible) {
			if (data.isMobile) {
				var newLeft = 0;
					newTop = 0;
			} else {
				var newLeft = ($(window).width() - data.contentWidth - data.padding) / 2,
					newTop = (data.options.top <= 0) ? (($(window).height() - data.contentHeight - data.padding) / 2) : data.options.top,
					arrowHeight = data.$arrows.outerHeight();
				
				if (data.options.fixed !== true) {
					newTop += $(window).scrollTop();
				}
				
				data.$arrows.css({ 
					marginTop: ((data.contentHeight - data.metaHeight - arrowHeight) / 2) 
				});
			}
			
			if (animate) {
				data.$boxer.stop().animate({ left: newLeft, top: newTop }, data.options.duration);
				data.$container.show().stop().animate({ height: data.contentHeight, width: data.contentWidth });
			} else {
				data.$boxer.css({ left: newLeft, top: newTop });
				data.$container.css({ height: data.contentHeight, width: data.contentWidth });
			}
		}
	}
	
	// Close boxer
	function _close(e) {
		if (e.preventDefault) {
			e.preventDefault();
			e.stopPropagation();
		}
		
		if (typeof data.$animatables !== "undefined") {
			data.$animatables.stop().animate({ opacity: 0 }, data.options.duration, function() {
				$(this).remove();
			});
			
			_clearTimer(data.resizeTimer);
			
			// Clean up
			$(window).off(".boxer")
			$("body").off(".boxer");
			
			if (data.gallery.active) {
				data.$boxer.off(".boxer");
			}
			
			if (data.isMobile) {
				$("html, body").css({ height: "", overflow: "", width: "" });
				
				if (data.type == "image" && data.gallery.active) {
					data.$container.off(".boxer");
				}
			}
			
			data = {};
		}
	}
	
	// Debounce resize events
	function _resize() {
		//data.resizeTimer = _startTimer(data.resizeTimer, 10, function() { pub.resize(); });
		pub.resize();
	}
	
	// Center boxer on resize
	function _center() {
		if (data.isMobile) {
			var newLeft = 0,
				newTop  = 0;
		} else {
			var newLeft = ($(window).width() - data.$boxer.width() - data.padding) / 2,
				newTop  = (data.options.top <= 0) ? (($(window).height() - data.$boxer.height() - data.padding) / 2) : data.options.top;
			
			if (data.options.fixed !== true) {
				newTop += $(window).scrollTop();
			}
		}
		
		data.$boxer.css({ 
			left: newLeft, 
			top:  newTop 
		});
	}
	
	// Load new image
	function _loadImage(source) {
		// Cache current image
		data.$image = $("<img />");
		
		data.$image.one("load.boxer", function() {
			var naturalSize = _naturalSize(data.$image);
			
			data.naturalHeight = naturalSize.naturalHeight;
			data.naturalWidth  = naturalSize.naturalWidth;
			
			if (data.options.retina) {
				data.naturalHeight /= 2;
				data.naturalWidth  /= 2;
			}
			
			data.$content.prepend(data.$image);
			if (data.$caption.html() == "") { 
				data.$caption.hide(); 
			} else { 
				data.$caption.show(); 
			}
			
			// Size content to be sure it fits the viewport
			if (_sizeImage(0)) {
				_open();
			}
		}).attr("src", source)
		  .addClass("boxer-image");
		
		// If image has already loaded into cache, trigger load event
		if (data.$image[0].complete || data.$image[0].readyState === 4) {
			data.$image.trigger("load");
		}
	}
	
	// Load new video
	function _loadVideo(source) {
		data.$videoWrapper = $('<div class="boxer-video-wrapper" />');
		data.$video = $('<iframe class="boxer-video" />');
		
		data.$video.attr("src", source)
				   .addClass("boxer-video")
				   .prependTo(data.$videoWrapper);
		
		data.$content.prepend(data.$videoWrapper);
		
		_sizeVideo();
		
		_open();
	}
	
	// Format caption
	function _formatCaption($target) {
		var title = $target.attr("title");
		return (title != "" && title !== undefined) ? '<p class="caption">' + title + '</p>' : "";
	}
	
	// Resize image to fit in viewport
	function _sizeImage(count) {
		data.windowHeight = data.viewportHeight = (count == 0) ? $(window).height() : data.windowHeight;
		data.windowWidth  = data.viewportWidth = (count == 0) ? $(window).width() : data.windowWidth;
		
		data.imageHeight  = (count == 0) ? data.naturalHeight : data.$image.outerHeight();
		data.imageWidth   = (count == 0) ? data.naturalWidth : data.$image.outerWidth();
		data.metaHeight   = (count == 0) ? 0 : data.metaHeight;
		
		if (count == 0) {
			data.ratioHorizontal = data.imageHeight / data.imageWidth;
			data.ratioVertical   = data.imageWidth / data.imageHeight;
			
			data.isWide = (data.imageWidth > data.imageHeight);
		}
		
		// Double check min and max
		if (data.imageHeight < data.options.minHeight) {
			data.options.minHeight = data.imageHeight;
		}
		if (data.imageWidth < data.options.minWidth) {
			data.options.minWidth = data.imageWidth;
		}
		
		if (data.isMobile) {
			data.viewportHeight -= data.padding;
			data.viewportWidth  -= data.padding;
			
			data.contentHeight = data.viewportHeight;
			data.contentWidth  = data.viewportWidth;
			
			data = _fitImage(data); 
			
			data.imageMarginTop  = (data.contentHeight - data.targetImageHeight) / 2;
			data.imageMarginLeft = (data.contentWidth - data.targetImageWidth) / 2;
		} else {
			data.viewportHeight -= data.options.margin + data.padding + data.metaHeight;
			data.viewportWidth  -= data.options.margin + data.padding;
			
			data = _fitImage(data);
			
			data.contentHeight = data.targetImageHeight;
			data.contentWidth  = data.targetImageWidth;
			
			data.imageMarginTop = 0;
			data.imageMarginLeft = 0;
		}
		
		// Modify DOM
		data.$content.css({ 
			height: (data.isMobile) ? data.contentHeight : "auto",
			width: data.contentWidth 
		});
		data.$meta.css({ 
			width: data.contentWidth 
		});
		data.$image.css({ 
			height: data.targetImageHeight, 
			width: data.targetImageWidth,
			marginTop:  data.imageMarginTop,
			marginLeft: data.imageMarginLeft
		});
		
		if (!data.isMobile) {
			data.metaHeight = data.$meta.outerHeight(true);
			data.contentHeight += data.metaHeight;
			
			if (data.contentHeight > data.viewportHeight && count < 2) {
				return _sizeImage(count+1);
			}
		}
		
		return true;
	}
	
	// Fit image to viewport
	function _fitImage(data) {
		if (data.isWide) {
			//WIDE
			data.targetImageWidth  = data.viewportWidth;
			data.targetImageHeight = data.targetImageWidth * data.ratioHorizontal;
			
			if (data.targetImageHeight > data.viewportHeight) {
				data.targetImageHeight = data.viewportHeight;
				data.targetImageWidth  = data.targetImageHeight * data.ratioVertical;
			}
		} else {
			//TALL
			data.targetImageHeight = data.viewportHeight;
			data.targetImageWidth = data.targetImageHeight * data.ratioVertical;
			
			if (data.targetImageWidth > data.viewportWidth) {
				data.targetImageWidth = data.viewportWidth;
				data.targetImageHeight = data.targetImageWidth * data.ratioHorizontal;
			}
		}
		
		// MAX
		if (data.targetImageWidth > data.imageWidth || data.targetImageHeight > data.imageHeight) {
			data.targetImageWidth = data.imageWidth;
			data.targetImageHeight = data.imageHeight;
		}
		
		// MIN
		if (data.targetImageWidth < data.options.minWidth || data.targetImageHeight < data.options.minHeight) {
			if (data.targetImageWidth < data.options.minWidth) {
				data.targetImageWidth = data.options.minWidth;
				data.targetImageHeight = data.targetImageWidth * data.ratioHorizontal;
			} else {
				data.targetImageHeight = data.options.minHeight;
				data.targetImageWidth = data.targetImageHeight * data.ratioVertical;
			}
		}
		
		return data;
	}
	
	// Resize image to fit in viewport
	function _sizeVideo() {
		data.windowHeight = $(window).height() - data.padding;
		data.windowWidth  = $(window).width() - data.padding;
		data.videoMarginTop = 0;
		data.videoMarginLeft = 0;
		
		if (data.isMobile) {
			data.$meta.css({ 
				width: data.windowWidth
			});
			data.metaHeight = data.$meta.outerHeight(true);
			
			data.contentHeight = data.windowHeight;
			data.contentWidth  = data.windowWidth;
			
			data.videoWidth  = data.windowWidth;
			data.videoHeight = data.videoWidth * data.options.videoRatio;
			
			if (data.videoHeight > data.windowHeight - data.metaHeight) {
				data.videoHeight = data.windowHeight - data.metaHeight;
				data.videoWidth  = data.videoHeight * data.options.videoRatio;
			}
			
			data.videoMarginTop = (data.contentHeight - data.videoHeight) / 2;
			data.videoMarginLeft = (data.contentWidth - data.videoWidth) / 2;
		} else {
			data.windowHeight -= data.options.margin;
			data.windowWidth  -= data.options.margin;
			
			data.videoWidth  = (data.options.videoWidth > data.windowWidth) ? data.windowWidth : data.options.videoWidth;
			data.videoHeight = data.videoWidth * data.options.videoRatio;
			
			data.contentHeight = data.videoHeight;
			data.contentWidth  = data.videoWidth;
		}
		
		data.$content.css({ 
			height: (data.isMobile) ? data.contentHeight : "auto",
			width: data.contentWidth 
		});
		data.$meta.css({ 
			width: data.contentWidth 
		});
		data.$videoWrapper.css({ 
			height: data.videoHeight, 
			width: data.videoWidth,
			marginTop: data.videoMarginTop,
			marginLeft: data.videoMarginLeft
		});
		
		if (!data.isMobile) {
			data.metaHeight = data.$meta.outerHeight(true);
			data.contentHeight = data.videoHeight + data.metaHeight;
		}
		data.contentWidth  = data.videoWidth;
	}
	
	// Advance gallery
	function _advanceGallery(e) {
		e.preventDefault();
		e.stopPropagation();
		
		// Click target
		var $arrow = $(this);
		
		if (!$arrow.hasClass("disabled")) {
			data.gallery.index += ($arrow.hasClass("next")) ? 1 : -1;
			if (data.gallery.index > data.gallery.total) {
				data.gallery.index = data.gallery.total;
			}
			if (data.gallery.index < 0) {
				data.gallery.index = 0;
			}
			
			data.$content.stop().animate({opacity: 0}, data.options.duration, function() {
				if (typeof data.$image !== 'undefined') {
					data.$image.remove();
				}
				if (typeof data.$videoWrapper !== 'undefined') {
					data.$videoWrapper.remove();
				}
				data.$target = data.gallery.$items.eq(data.gallery.index);
				
				data.$caption.html(data.options.formatter.apply($("body"), [data.$target]));
				data.$position.find(".current").html(data.gallery.index + 1);
				
				var source = data.$target.attr("href"),
					isVideo = ( source.indexOf("youtube.com/embed") > -1 || source.indexOf("player.vimeo.com/video") > -1 );
				
				if (isVideo) {
					_loadVideo(source);
				} else {
					_loadImage(source);
				}
				_updatePagination();
			});
		}
	}
	
	// Update galery arrows
	function _updatePagination() {
		data.$arrows.removeClass("disabled");
		if (data.gallery.index == 0) { 
			data.$arrows.filter(".previous").addClass("disabled");
		}
		if (data.gallery.index == data.gallery.total) {
			data.$arrows.filter(".next").addClass("disabled");
		}
	}
	
	// Handle keypress in gallery
	function _keypress(e) {
		if (data.gallery.active && (e.keyCode == 37 || e.keyCode == 39)) {
			e.preventDefault();
			e.stopPropagation();
			
			data.$arrows.filter((e.keyCode == 37) ? ".previous" : ".next").trigger("click");
		} else if (e.keyCode == 27) {
			data.$boxer.find(".boxer-close").trigger("click");
		}
	}
	
	// Clone inline element
	function _cloneElement(id) {
		var $clone = $(id).find(">:first-child").clone();
		_appendObject($clone);
	}
	
	// Load URL into iFrame
	function _loadURL(source) {
		source = source + ((source.indexOf("?") > -1) ? "&"+options.requestKey+"=true" : "?"+options.requestKey+"=true");
		var $iframe = $('<iframe class="boxer-iframe" src="' + source + '" />');
		_appendObject($iframe);
	}
	
	// Append jQuery object
	function _appendObject($obj) {
		data.$content.append($obj);
		_sizeContent($obj);
		_open();
	}
	
	// Size jQuery object
	function _sizeContent($object) {
		data.objectHeight     = $object.outerHeight(true),
		data.objectWidth      = $object.outerWidth(true),
		data.windowHeight     = $(window).height() - data.padding,
		data.windowWidth      = $(window).width() - data.padding,
		data.dataHeight       = data.$target.data("height"),
		data.dataWidth        = data.$target.data("width"),
		data.maxHeight        = (data.windowHeight < 0) ? options.minHeight : data.windowHeight,
		data.isIframe         = $object.is("iframe");
		data.objectMarginTop  = 0;
		data.objectMarginLeft = 0;
			
		if (!data.isMobile) {
			data.windowHeight -= data.options.margin;
			data.windowWidth  -= data.options.margin;
		}
		
		data.contentHeight = (data.dataHeight != undefined) ? data.dataHeight : (data.isIframe) ? data.windowHeight : data.objectHeight;
		data.contentWidth  = (data.dataWidth != undefined)  ? data.dataWidth  : (data.isIframe) ? data.windowWidth  : data.objectWidth;
		
		if (data.isIframe && data.isMobile) {
			data.contentHeight = data.windowHeight;
			data.contentWidth  = data.windowWidth;
		}
		
		if (!data.isIframe) {
			if (data.contentHeight > data.maxHeight) {
				data.contentHeight = data.maxHeight;
				data.$content.css({ 
					overflowY: "scroll" 
				});
			} else {
				data.$content.css({ 
					overflowY: "auto" 
				});
			}
		}
		
		data.$content.css({ 
			height: data.contentHeight, 
			width:  data.contentWidth
		});
	}
	
	
	
	// Handle touch start
	function _touchStart(e) {
		e.preventDefault();
		e.stopPropagation();
		
		_clearTimer(data.touchTimer);
		
		if (!data.isAnimating) {
			var touch = (typeof e.originalEvent.targetTouches !== "undefined") ? e.originalEvent.targetTouches[0] : null;
			data.xStart = (touch) ? touch.pageX : e.clientX;
			data.leftPosition = 0;
			
			data.touchMax = Infinity;
			data.touchMin = -Infinity;
			data.edge = data.contentWidth * 0.25;
			
			if (data.gallery.index == 0) {
				data.touchMax = 0;
			}
			if (data.gallery.index == data.gallery.total) {
				data.touchMin = 0;
			}
			
			$(window).on("touchmove.boxer", _touchMove)
					 .one("touchend.boxer", _touchEnd);
		}
	}
	
	// Handle touch move
	function _touchMove(e) {
		var touch = (typeof e.originalEvent.targetTouches !== "undefined") ? e.originalEvent.targetTouches[0] : null;
		
		data.delta = data.xStart - ((touch) ? touch.pageX : e.clientX);
		
		// Only prevent event if trying to swipe
		if (data.delta > 20) {
			e.preventDefault();
			e.stopPropagation();
		}
		
		data.canSwipe = true;
		
		var newLeft = -data.delta; //data.leftPosition - data.delta;
		if (newLeft < data.touchMin) {
			newLeft = data.touchMin;
			data.canSwipe = false;
		}
		if (newLeft > data.touchMax) {
			newLeft = data.touchMax;
			data.canSwipe = false;
		}
		
		data.$image.css({ transform: "translate3D("+newLeft+"px,0,0)" });
		
		data.touchTimer = _startTimer(data.touchTimer, 300, function() { _touchEnd(e); });
	}
	
	// Handle touch end
	function _touchEnd(e) {
		e.preventDefault();
		e.stopPropagation();
		
		_clearTimer(data.touchTimer);
			
		$(window).off("touchmove.boxer")
				 .off("touchend.boxer");
		
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
				data.$arrows.filter( (data.delta <= data.leftPosition) ? ".previous" : ".next" ).trigger("click");
			}
			_startTimer(data.resetTimer, data.options.duration, function() { 
				data.$boxer.removeClass("animated");
			});
		}
	}
	
	// Start Timer
	function _startTimer(timer, time, func) {
		_clearTimer(timer);
		return setTimeout(func, time);
	}
	
	// Clear timer
	function _clearTimer(timer) {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}
	
	function _naturalSize($img) {
		var node = $img[0],
			img = new Image();
		
		if (typeof node.naturalHeight != "undefined") {
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
	
	
	// Define Plugin
	$.fn.boxer = function(method) {
		if (pub[method]) {
			return pub[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return _init.apply(this, arguments);
		}
		return this;	
	};
	
	$.boxer = function($target, opts) {
		return _build($.Event("click", { data: $.extend({
			$object: $target
		}, options, opts || {}) }));
	}
})(jQuery);