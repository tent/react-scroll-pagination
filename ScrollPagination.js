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

var ScrollPagination = window.ScrollPagination = React.createClass({
	displayName: "ScrollPagination",

	getInitialState: function () {
		return {
			hasPrevPage: false,
			hasNextPage: false,
			prevPagesMargin: 0,
			nextPagesMargin: 0
		};
	},

	getDefaultProps: function () {
		return {
			hasPrevPage: false,
			hasNextPage: false,
			loadPrevPage: function () {},
			loadNextPage: function () {}
		};
	},

	componentWillMount: function () {
		this.__pages = {};
		this.__pageIds = [];

		this.__initPageExistance(this.props);
	},

	componentDidMount: function () {
		var scrollParent = this.__scrollParent = findScrollParent(this.getDOMNode());
		scrollParent.addEventListener("scroll", this.__handleScroll, false);
		scrollParent.addEventListener("resize", this.__handleResize, false);

		this.__mounted = true;

		this.__updatePageIds();
		this.__updateDimensions();
	},

	componentWillReceiveProps: function (nextProps) {
		this.__initPageExistance(nextProps);
	},

	componentDidUpdate: function () {
		this.__updatePageIds();
		this.__updateDimensions();

		this.__loadingNextPage = false;
		this.__loadingPrevPage = false;
		this.__unloadingPage = false;

		this.__evaluatePagesMutation();
	},

	componentWillUnmount: function () {
		var scrollParent = this.__scrollParent;
		scrollParent.removeEventListener("scroll", this.__handleScroll, false);
		scrollParent.removeEventListener("resize", this.__handleResize, false);
	},

	render: function () {
		var style = {};
		if (this.state.prevPagesMargin) {
			style.paddingTop = this.state.prevPagesMargin + "px";
		}
		if (this.state.nextPagesMargin) {
			style.paddingBottom = this.state.nextPagesMargin + "px";
		}
		return React.DOM.div({
			style: style,
			ref: "wrapper"
		}, this.props.children);
	},

	// called from Page component via parent component
	handlePageEvent: function (pageId, event) {
		if (event.name === "mount" || event.name === "update") {
			this.__pages[pageId] = {
				id: pageId,
				height: event.height
			};

			this.__updateMargins();
		}
	},

	__initPageExistance: function (props) {
		var hasPrevPage = false;
		if (Number.isInteger(props.prevPageCount) && props.prevPageCount > 0) {
			hasPrevPage = true;
		} else {
			hasPrevPage = props.hasPrevPage;
		}

		var hasNextPage = false;
		if (Number.isInteger(props.nextPageCount) && props.nextPageCount > 0) {
			hasNextPage = true;
		} else {
			hasNextPage = props.hasNextPage;
		}

		this.setState({
			hasPrevPage: hasPrevPage,
			hasNextPage: hasNextPage
		});
	},

	__updateMargins: function () {
		if ( !this.__mounted ) {
			return;
		}

		var avgHeight = 0;
		var count = 0;
		var sum = 0;
		var pages = this.__pages;
		Object.keys(pages).forEach(function (pageId) {
			count++;
			sum += pages[pageId].height;
		});
		avgHeight = Math.round(sum / count);

		var prevPagesMargin = 0;
		var nextPagesMargin = 0;

		if (Number.isInteger(this.props.prevPageCount)) {
			prevPagesMargin = this.props.prevPageCount * avgHeight;
		}

		if (Number.isInteger(this.props.nextPageCount)) {
			nextPagesMargin = this.props.nextPageCount * avgHeight;
		}

		this.setState({
			prevPagesMargin: prevPagesMargin,
			nextPagesMargin: nextPagesMargin
		});
	},

	__unloadPage: function (pageId) {
		if (this.__unloadingPage) {
			return;
		}
		this.__unloadingPage = true;
		this.props.unloadPage(pageId);
	},

	__loadPrevPage: function () {
		if (this.__loadingPrevPage || !this.state.hasPrevPage) {
			return;
		}
		this.__loadingPrevPage = true;
		this.props.loadPrevPage();
	},

	__loadNextPage: function () {
		if (this.__loadingNextPage || !this.state.hasNextPage) {
			return;
		}
		this.__loadingNextPage = true;
		this.props.loadNextPage();
	},

	__getScrollY: function () {
		var scrollParent = this.__scrollParent;
		if (scrollParent === window) {
			return window.scrollY;
		} else {
			return scrollParent.scrollTop;
		}
	},

	__setScrollY: function (scrollY) {
		var scrollParent = this.__scrollParent;
		if (scrollParent === window) {
			return window.scrollTo(window.scrollX, scrollY);
		} else {
			return scrollParent.scrollTop = scrollY;
		}
	},

	__updatePageIds: function () {
		var oldPageIds = this.__pageIds;
		var unloadedPageIdsTop = [];
		var newPageIdsTop = [];
		var pageIds = [];
		var findPages = function (children) {
			React.Children.forEach(children, function (child) {
				if (child.constructor.displayName === "ScrollPagination.Page") {
					pageIds.push(child.props.id);
				} else if (child.constructor.displayName === "ul") {
					findPages(child.props.children);
				}
			});
		};
		findPages(this.props.children);
		var i, len;
		if (oldPageIds.length > 0) {
			for (i = 0, len = oldPageIds.length; i < len; i++) {
				if (pageIds.indexOf(oldPageIds[i]) === -1) {
					unloadedPageIdsTop.push(oldPageIds[i]);
				} else {
					break;
				}
			}
			for (i = 0, len = pageIds.length; i < len; i++) {
				if (oldPageIds.indexOf(pageIds[i]) === -1) {
					newPageIdsTop.push(pageIds[i]);
				} else {
					break;
				}
			}
		}
		this.__adjustScrollPosition(unloadedPageIdsTop, newPageIdsTop);
		this.__pageIds = pageIds;
	},

	__adjustScrollPosition: function (unloadedPageIdsTop, newPageIdsTop) {
		var offset = 0;
		var pages = this.__pages;
		unloadedPageIdsTop.forEach(function (pageId) {
			var height = pages[pageId].height;
			offset += height;
			delete pages[pageId];
		});
		newPageIdsTop.forEach(function (pageId) {
			var height = pages[pageId].height;
			offset += height;
		});
		this.__setScrollY(this.__getScrollY() + offset);
	},

	__updateDimensions: function () {
		var el = this.refs.wrapper.getDOMNode();
		var scrollParent = this.__scrollParent;
		var viewportHeight = 0;
		if (scrollParent === window) {
			viewportHeight = window.innerHeight;
		} else {
			viewportHeight = parseInt(window.getComputedStyle(scrollParent).height, 10);
		}
		var contentHeight = el.offsetHeight;

		var offsetTop = 0;
		var ref = el;
		while (ref) {
			offsetTop += ref.offsetTop || 0;
			ref = ref.offsetParent;
			if (ref === scrollParent) {
				break;
			}
		}

		this.__dimentions = {
			viewportHeight: viewportHeight,
			contentHeight: contentHeight,
			offsetTop: offsetTop
		};
	},

	__evaluatePagesMutation: function (e) {
		if (this.__dimentions.contentHeight === 0) {
			return;
		}
		if (this.__loadingNextPage || this.__loadingPrevPage || this.__unloadingPage || !(this.state.hasNextPage || this.state.hasPrevPage)) {
			if (e) {
				e.preventDefault();
			}
			return;
		}

		var pages = this.__pages;
		var pageIds = this.__pageIds;
		var firstPage = pages[pageIds[0]];
		var secondPage = pages[pageIds[1]];
		var lastPage = pages[pageIds[pageIds.length-1]];
		var secondLastPage = pages[pageIds[pageIds.length-2]];

		if (pages.length < 4) {
			secondPage = null;
			secondLastPage = null;
		}

		var viewportHeight = this.__dimentions.viewportHeight;
		var contentHeight = this.__dimentions.contentHeight;
		var offsetTop = this.__dimentions.offsetTop;
		var scrollY = this.__getScrollY();

		var remainingScrollBottom = contentHeight - scrollY - viewportHeight + offsetTop;
		var remainingScrollTop = contentHeight - remainingScrollBottom - viewportHeight;

		if (Number.isInteger(this.props.nextPageCount)) {
			console.log("TODO: calculate current page from scroll position");
		} else {
			if (lastPage && remainingScrollBottom < (lastPage.height / 3)) {
				if (secondPage && remainingScrollTop > (firstPage.height + secondPage.height)) {
					this.__unloadPage(firstPage.id);
				} else {
					this.__loadNextPage();
				}
				return;
			}
		}

		if (Number.isInteger(this.props.prevPageCount)) {
			console.log("TODO: calculate current page from scroll position");
		} else {
			if (firstPage && remainingScrollTop < (firstPage.height / 3)) {
				if (secondLastPage && remainingScrollBottom > (lastPage.height + secondLastPage.height)) {
					this.__unloadPage(lastPage.id);
				} else {
					this.__loadPrevPage();
				}
				return;
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

ScrollPagination.Page = React.createClass({
	displayName: "ScrollPagination.Page",

	getDefaultProps: function () {
		return {
			component: React.DOM.div
		};
	},

	componentDidMount: function () {
		this.__determineHeight();
	},

	componentDidUpdate: function () {
		if (this.__height === 0) {
			this.__determineHeight();
		}
	},

	render: function () {
		return this.props.component(null, this.props.children);
	},

	__determineHeight: function () {
		var height = this.__height = this.getDOMNode().offsetHeight;
		this.props.onPageEvent(this.props.id, {
			name: "mount",
			height: height
		});
	}
});

})();
