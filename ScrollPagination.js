(function () {
"use strict";

var findScrollParent = function (el) {
	var ref = el;
	while (ref) {
		switch (window.getComputedStyle(ref).overflow) {
			case "auto":
				return ref;
			case "scroll":
				return ref;
		}
		ref = ref.parentElement;
	}
	return window;
};

window.ScrollPagination = React.createClass({
	displayName: "ScrollPagination",

	getDefaultProps: function () {
		return {
			pageIds: [],
			loadPrevPage: function () {},
			loadNextPage: function () {}
		};
	},

	componentWillMount: function () {
		this.__paddingTop = 0;
		this.__offsetHeight = 0;
		this.__offsetTop = 0;
		this.__offsetBottom = 0;

		this.__renderedPageIds = [];
		this.__unloadedPageHeights = {};
		this.__pageHeights = {};
	},

	componentDidMount: function () {
		var scrollParent = this.__scrollParent = findScrollParent(this.getDOMNode());
		this.__updateDimensions();
		this.__evaluatePagesMutation();
		scrollParent.addEventListener("scroll", this.__handleScroll, false);
		scrollParent.addEventListener("resize", this.__handleResize, false);

		this.__hasPrevPage = this.props.hasPrevPage;
		this.__hasNextPage = this.props.hasNextPage;
	},

	componentWillUpdate: function (props) {
		this.__loadingPrevPage = false;
		this.__loadingNextPage = false;
		this.__unloadingPage = false;

		// save scroll position
		if (this.__scrollParent === window) {
			this.__scrollY = window.scrollY;
		} else {
			this.__scrollY = this.__scrollParent.scrollTop;
		}

		this.__determinePagesDelta(props.pageIds);

		this.__hasPrevPage = props.hasPrevPage;
		this.__hasNextPage = props.hasNextPage;
	},

	componentDidUpdate: function () {
		this.__updateDimensions();

		// restore scroll position
		if (this.__scrollParent === window) {
			window.scrollTo(0, this.__scrollY);
		} else {
			this.__scrollParent.scrollTop = this.__scrollY;
		}
		delete this.__scrollY;

		this.__evaluatePagesMutation();
	},

	componentWillUnmount: function () {
		var scrollParent = this.__scrollParent;
		scrollParent.removeEventListener("scroll", this.__handleScroll, false);
		scrollParent.removeEventListener("resize", this.__handleResize, false);
	},

	render: function () {
		var style = {};
		if (this.__paddingTop) {
			style.paddingTop = this.__paddingTop + "px";
		}
		return React.DOM.div({
			style: style,
			ref: "wrapper"
		}, this.props.children);
	},

	__unloadPage: function (pageId) {
		if (this.__unloadingPage) {
			return;
		}
		this.__unloadingPage = true;
		this.props.unloadPage(pageId);
	},

	__loadPrevPage: function () {
		if (this.__loadingPrevPage || !this.__hasPrevPage) {
			return;
		}
		this.__loadingPrevPage = true;
		this.props.loadPrevPage();
	},

	__loadNextPage: function () {
		if (this.__loadingNextPage || !this.__hasNextPage) {
			return;
		}
		this.__loadingNextPage = true;
		this.props.loadNextPage();
	},

	__determinePagesDelta: function (pageIds) {
		var renderedPageIds = this.__renderedPageIds;

		// find new page id (if any)
		// must be either at beginning or end of list
		var newPageId = null;
		var newPagePosition = null;
		var unloadedPageId = null;
		var unloadedPagePosition = null;
		var firstPageId = pageIds[0];
		var lastPageId = pageIds[pageIds.length-1];
		if (renderedPageIds.indexOf(lastPageId) === -1) {
			newPageId = lastPageId;
			newPagePosition = "bottom";
		} else if (renderedPageIds.indexOf(firstPageId) === -1) {
			newPageId = firstPageId;
			newPagePosition = "top";
		} else if (pageIds.length > renderedPageIds.length) {
			throw new Error("ScrollPagination: New pages must be inserted at beginning or end!\nold("+ renderedPageIds.join(", ") +")\nnew("+ pageIds.join(", ") +")");
		} else {
			// find removed page id
			// must be either at beginning or end of list
			var firstRenderedPageId = renderedPageIds[0];
			var lastRenderedPageId = renderedPageIds[renderedPageIds.length-1];
			if (firstRenderedPageId !== firstPageId) {
				unloadedPageId = renderedPageIds[0];
				unloadedPagePosition = "top";
			} else if (lastRenderedPageId !== lastPageId) {
				unloadedPageId = lastRenderedPageId;
				unloadedPagePosition = "bottom";
			}
		}

		var pageNumDelta = pageIds.length - renderedPageIds.length;
		if (newPageId && pageNumDelta !== 1 || unloadedPageId && pageNumDelta !== -1) {
			throw new Error("ScrollPagination: May only add or remove a single page but there is a difference of "+ pageNumDelta +"!");
		}

		renderedPageIds = [].concat(pageIds);
		this.__renderedPageIds = renderedPageIds;

		this.__newPageId = newPageId;
		this.__newPagePosition = newPagePosition;
		this.__unloadedPageId = unloadedPageId;
		this.__unloadedPagePosition = unloadedPagePosition;
	},

	__updateDimensions: function () {
		var unloadedPageHeights = this.__unloadedPageHeights;
		var pageHeights = this.__pageHeights;

		var newPageId = this.__newPageId;
		var newPagePosition = this.__newPagePosition;
		delete this.__newPagePosition;

		var unloadedPageId = this.__unloadedPageId;
		var unloadedPagePosition = this.__unloadedPagePosition;
		delete this.__unloadedPageId;
		delete this.__unloadedPagePosition;

		if (unloadedPageId) {
			delete pageHeights[unloadedPageId];
		}

		var el = this.refs.wrapper.getDOMNode();

		var oldOffsetHeight = this.__offsetHeight;
		var newOffsetHeight = el.offsetHeight;
		var offsetHeightDelta = newOffsetHeight - oldOffsetHeight;
		var oldPageHeight;
		var pageHeightDelta = 0;

		var scrollParent = this.__scrollParent;

		if (newPageId) {
			if (newPagePosition === "top") {
				var oldPaddingTop = this.__paddingTop;
				oldPageHeight = unloadedPageHeights[newPageId];
				delete unloadedPageHeights[newPageId];
				if (oldPageHeight && oldPageHeight !== offsetHeightDelta) {
					pageHeightDelta = oldPageHeight - offsetHeightDelta;
				}
				if (this.__paddingTop < 1) {
					var __scrollTop;
					if (scrollParent === window) {
						__scrollTop = window.scrollY;
					} else {
						__scrollTop = scrollParent.scrollTop;
					}
					this.__scrollY = __scrollTop + offsetHeightDelta;
				}
				this.__paddingTop = Math.max(this.__paddingTop - offsetHeightDelta - pageHeightDelta, 0);
				this.refs.wrapper.getDOMNode().style.paddingTop = this.__paddingTop +"px";
			} else { // bottom
			}

			pageHeights[newPageId] = offsetHeightDelta;
		} else {
			if (unloadedPagePosition === "top") {
				oldPaddingTop = this.__paddingTop;
				this.__paddingTop = this.__paddingTop + (offsetHeightDelta * -1); // negative delta
				unloadedPageHeights[unloadedPageId] = offsetHeightDelta * -1;
				this.refs.wrapper.getDOMNode().style.paddingTop = this.__paddingTop +"px";
			}
		}

		newOffsetHeight = el.offsetHeight;
		this.__offsetHeight = newOffsetHeight;

		var offsetTop = 0;
		var ref = el;
		while (ref) {
			offsetTop += ref.offsetTop || 0;
			ref = ref.offsetParent;
		}
		this.__offsetTop = offsetTop;

		if (scrollParent) {
			if (scrollParent === window) {
				this.__viewportHeight = window.innerHeight;
			} else {
				this.__viewportHeight = parseInt(window.getComputedStyle(scrollParent).height, 10);
			}
		}
	},

	__evaluatePagesMutation: function (e) {
		if (this.__offsetHeight === 0) {
			return;
		}
		if (this.__loadingNextPage || this.__loadingPrevPage || this.__unloadingPage) {
			if (e) {
				e.preventDefault();
			}
			return;
		}

		var scrollY;
		if (this.__scrollParent === window) {
			scrollY = window.scrollY;
		} else {
			scrollY = this.__scrollParent.scrollTop;
		}
		var viewportHeight = this.__viewportHeight;
		var paddingTop = this.__paddingTop;
		var remainingScrollBottom = this.__offsetHeight + this.__offsetBottom - scrollY - viewportHeight;
		var pagesOffsetTop = this.__offsetTop + paddingTop;
		var remainingScrollTop = scrollY - pagesOffsetTop;

		var pageIds = this.props.pageIds;
		var pageHeights = this.__pageHeights;
		var firstPageId = pageIds[0];
		var firstPageHeight = pageHeights[firstPageId];
		var lastPageId = pageIds[pageIds.length-1];
		var lastPageHeight = pageHeights[lastPageId];

		if ( !lastPageHeight || remainingScrollBottom <= (lastPageHeight / 3)) {
			if (firstPageHeight && (scrollY - pagesOffsetTop - firstPageHeight) > viewportHeight && this.__newPageId !== firstPageId) {
				this.__unloadPage(firstPageId);
			} else {
				this.__loadNextPage();
			}
		} else if ((paddingTop > 1 || this.__hasPrevPage) && remainingScrollTop <= (firstPageHeight / 3)) {
			if (pageIds.length > 1 && (this.__offsetHeight - scrollY - viewportHeight) > lastPageHeight && this.__newPageId !== lastPageId) {
				this.__unloadPage(lastPageId);
			} else {
				this.__loadPrevPage();
			}
		}
	},

	__handleScroll: function (e) {
		this.__evaluatePagesMutation(e);
	},

	__handleResize: function () {
		this.__updateDimensions();
		this.__evaluatePagesMutation();
	}
});

})();
