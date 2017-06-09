## Automatic Pjax

The `Pjax.js` is <s>a jQuery plugin</s> script that uses ajax, `pushState` and automatically detects links and forms, for configure page you need use `id="pjax-container"` in all pages, example:

```html
<div id="pjax-container">
    ...
</div>
```

Pjax load all content from pages, but uses only contents from first element using `pjax-container`, if you don't need the Pjax in a spefic link or form then use `data-pjax-ignore` attribute, example:

```html
<p>
    Hello world!
    Example <a data-pjax-ignore href="/page.html">page</a>.
</p>
```

## Support

The `auto-pjax.js` support links, forms with method `GET`, forms with method `POST` and support files and multiple files (`<input type="file" multiple>`).

Requirements:

- `DOMParser`
- `pushState`, `replaceState` and `popstate` (DOM History manipulation)
- `FormData` (XMLHttpRequest Level 2) - if need upload files using PJAX (`enctype="multipart/form-data"`)

## Usage

For use:

```js
Pjax.start();
```

For change configs use like this:

```js
Pjax.start({
    containers: [ "#my-container" ], //Change container element
    scrollLeft: -1, //Disable autoscroll
    scrollTop: -1 //Disable autoscroll
});
```

## Pjax configs

Property | type | default | Description
--- | --- | --- | ---
`containers:` | `array` | `[ "#pjax-container" ]` | Informs which elements to update on the page
`updatecurrent:` | `bool` | `false` |
`updatehead:` | `bool` | `true` | The "autopjax" has an intelligent update system that helps avoid the "blink" effect, because instead of updating everything it only updates what has been changed, however if you are sure that nothing will change as you page, you can set it to false ", The only one that will continue to be updated will be the `<title>` tag.
`scrollLeft:` | `number` | `0` | After loading a page via PJAX you can define where scrollLeft should scroll.
`scrollTop:` | `number` | `0` | After loading a page via PJAX you can define where scrollTop should scroll.
`loader:` | `bool` | `true` | Adds the native Pjax loader, if you want to create a loader of your own, set it to `false`.

If need overwrite properties for specific link or form you can config using HTML attributes:

Property | equivalent | example
--- | --- | ---
`data-pjax-containers` | `containers:` | `<a href="..." data-pjax-containers="[ &quot;#foo&quot;, &quot;#bar&quot;, &quot;#baz&quot; ]"`
`data-pjax-updatehead` | `updatehead:` | `<a href="..." data-pjax-updatehead="false"`
`data-pjax-scroll-left` | `scrollLeft:` | `<form action="..." data-pjax-scroll-left="10"`
`data-pjax-scroll-top` | `scrollRight:` | `<form action="..." data-pjax-scroll-right="-1"`
`data-pjax-loader` | `loader:` | `<a href="..." data-pjax-loader="false"`

## Update two elements (or more)

You can change the element you want to update or even add more elements, eg.:

```html
<div id="navbar">
    ...
</div>
<div id="my-container">
    ...
</div>
<script>
Pjax.start({
    containers: [ "#navbar", "#my-container" ] //Change containers element
});
</script>
```

## Pjax API

Method | Description
--- | ---
`Pjax.remove("remove");` | Remove PJAX requests and events
`Pjax.on("initiate", function(event, url, config) {...});` | Trigged when clicked in a link or submit a form
`Pjax.on("done", function(event, url) {...});` | Trigged when page loaded using `$.jax`
`Pjax.on("fail", function(event, url, status, error) {...});` | Trigged when page failed to load, `status` return HTTP code and `error` return message error
`Pjax.on("then", function(event, url) {...});` | Executes every time a request is completed, even if it fails or succeeds.

You can change configs in `pjax.initiate` event, example:

```html
<div id="pjax-container">
    <div id="filter">
        <form>
            ...
        </form>
    </div>
    <div id="search-container">
        ...
    </div>
</div>
<script>
Pjax.start();

Pjax.on("initiate", function (e, url, configs) {
    if (url.indexOf("/search/") === 0 && window.location.href.indexOf("/search/") === 0) {
        configs.containers = [ "#search-container" ];
    }
});
</script>
```

If you are on a product search page and are doing a new search instead of updating the entire container will only update the element where the products are, other pages will continue to update the entire container.

## Pjax in server-side

It is possible to detect if the request came from the PJAX using the request headers:

Header | Description
--- | ---
`X-PJAX` | Indicates that the page was requested via PJAX
`X-PJAX-URL` | Inform the entire url of the requested page
`X-PJAX-Container` | Informs the container selectors used

Example using PHP:

```php
if (isset($_SERVER['HTTP_X_PJAX'])) {
    echo 'You using pjax';
}
```

## Custom loader with PJAX

You can custom CSS, example change color and size, put in new CSS file or `<style>` tag:

```css
.pjax-loader .pjax-progress {
    height: 6px;
    background-color: blue;
}
```

If you need custom "more", first remove default loader:

```javascript
Pjax.start({
    "loader": false
});
```

And after use `pjax.initiate` and `pjax.then` events:

```javascript
Pjax.on("initiate", function () {
    $(".my-custom-loader").css("display", "block");
});

Pjax.on("then", function () {
    $(".my-custom-loader").css("display", "none");
});
```

HTML:

```html
<div class="my-custom-loader">
    <img src="loader.gif">
</div>
```
