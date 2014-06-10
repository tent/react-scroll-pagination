ScrollPagination
================

[React](http://reactjs.org/) component for handing infinite scroll without infinitely growing the DOM.

## Usage

```
/** @jsx React.DOM */
<ScrollPagination
	pageIds={ Array() }
	hasPrevPage={ Boolean() }
	hasNextPage={ Boolean() }
	loadPrevPage={ function(){} }
	loadNextPage={ function(){} }
	unloadPage={ function (pageId) {} }>

	<h1>Render content here</h1>
</ScrollPagination>
```

```javascript
ScrollPagination({
	pageId: Array(),
	hasPrevPage: Boolean(),
	hasNextPage: Boolean(),
	loadPrevPage: function(){},
	loadNextPage: function(){},
	unloadPage: function (pageId) {}
}, React.DOM.h1(null, "Render content here"))
```

- `pageIds` must be an array of all page ids currently rendered. The initial render must only contain a single page id and subsequent renders must only add or remove a single page id.

- `hasPrevPage` must be a boolean indicating if `loadPrevPage` should be called.

- `hasNextPage` must be a boolean indicating if `loadNextPage` should be called.

- `loadPrevPage` must be a function that causes a re-render with a single page prepended.

- `loadNextPage` must be a function that causes a re-render with a single page appended.

- `unloadPage` must be a function that causes a re-render with the specified page id removed.

## What it does

The scroll container will be determined when the component is first mounted (any parent element with `overflow:auto` or `overflow:scroll`, defaults to `window`).

`loadPrevPage` and `loadNextPage` are called when there is one thrid or less of the current page height out of view above and below respectively.

`unloadPage` is called before `loadPrevPage` or `loadNextPage` if there is a page at the opposite end of the visible area entirely out of view.

The height of each rendered page is calculated and cached to determine when a new page should be loaded or an old one removed. Page heights for pages removed from the top are also kept to help keep the padding accurate if/when the page is loaded again.

## Why

Infinite scroll implementations where DOM nodes are continually added without cleaning up cause the DOM to get __very__ slow the farther you scroll down (especially when you have any kind of dynamic content). Removing what you don't need from the DOM and replacing it with padding allows scrolling through pages without slowing down the DOM.

## How you can help

File an [issue](https://github.com/cupcake/react-scroll-pagination/issues) if you find anything isn't working as expected.

Pull requests are always welcome, but you should open an issue before working on a new feature (both to ensure it's within the scope of this project and that it's not already being worked on).

