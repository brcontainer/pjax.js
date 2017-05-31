## Automatic Pjax

The `auto-pjax.js` is a jQuery plugin that uses ajax, `pushState` and automatically detects links and forms, for configure page you need use `pjax-container` class in all pages, example:

```html
<div class="pjax-container">
    ...
</div>
```

Pjax load all content from pages, but uses only contents from first element using `pjax-container`, if you need don't Pjax in a spefic link or form define `data-ignore-pjax` attribute , example:

```html
<p>
    Hello world!
    Example <a data-pjax-ignore href="/page.html">page</a>.
</p>
```

## Pjax API

Method | Equivalent
--- | ---
`$(document).on("pjax.initiate", function(url) {...});` | Trigged when clicked in a link or submit a form
`$(document).on("pjax.done", function(url) {...});` | Trigged when page loaded using `$.jax`
`$(document).on("pjax.fail", function(url, status, error) {...});` | Trigged when page failed to load, `status` return HTTP code and `error` return message error

## Support

The `auto-pjax.js` support links, forms with method GET, forms with method POST and support files and multiple files (`<input type="file" multiple>`).

Requirements:

- `DOMParser`
- DOM History manipulation
