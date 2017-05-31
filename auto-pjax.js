/*
 * auto-pjax.js 0.0.2
 *
 * Copyright (c) 2017 Guilherme Nascimento (brcontainer@yahoo.com.br)
 *
 * Released under the MIT license
 */

(function (w, d) {
    "use strict";

    if (!w.history.pushState || !w.DOMParser || !/^http(|s):$/.test(w.location.protocol)) {
        return;
    }

    var pjax, xhr, container, tmp, loader, progress, doc = $(d), head = $(d.head),
        host = w.location.protocol.replace(/:/g, "") + "://" + w.location.host;

    function showProgress(show) {
        if (show) {
            progress.css({ "display": "block", "width": "0%" });

            setTimeout(function () {
                progress.css("width", "90%");
            }, 1);
        } else {
            progress.css("display", "none");
            progress.removeClass("show-progress");
        }
    }

    function pjaxLoad(url, changestate, method, data)
    {
        if (pjax) {
            pjax.abort();
        }

        doc.trigger("pjax.initiate", [url]);

        showProgress(true);

        var opts = { "headers": { "X-PJAX": "true" } };

        if (method && data) {
            opts.data = data;
            opts.type = method;
            opts.processData = false;
        }

        opts.url = url;

        pjax = $.ajax(opts).done(function (data) {
            tmp = (new DOMParser).parseFromString(data, "text/html");

            $(':focus').blur();

            var title = $("title", tmp).text() || "";

            if (changestate) {
                w.history.pushState({ "pjaxUrl": url }, title, url.substring(host.length));
            }

            //Update head
            head.html($(tmp.head).html());

            //Update title
            d.title = title;

            //Update container
            container.html( $(".pjax-container", tmp).html() || "" );

            tmp = null;

            showProgress(false);

            doc.trigger("pjax.done", [url]);
        }).fail(function (xhr, status, error) {
            showProgress(false);

            doc.trigger("pjax.fail", [url, status, error]);
        });
    }

    w.addEventListener("popstate", function (e) {
        pjaxLoad(String(w.location), false);
    });

    var ignore = ":not([data-pjax-ignore]):not([href^='#']):not([href^='javascript:'])";

    function pjaxRequest(e) {

        container = container || $(".pjax-container");

        if (!container.length) {
            container = null;
            return;
        }

        if (!loader) {
            loader = $('<div class="pjax-loader"><div style="width: 1%" class="pjax-progress"></div></div>');
            progress = $(".pjax-progress", loader);
            $(loader).insertBefore("body");
        }

        var method, data, url = this.nodeName === "FORM" ? this.action : this.href;

        if (url.indexOf(host) !== 0) {
            return;
        }

        if (this.nodeName === "FORM") {
            method = String(this.method).toUpperCase();

            if (method === "POST" && !w.FormData) {
                return;
            }

            data = new FormData(this);
        }

        e.preventDefault();

        if (url === String(w.location) && method !== "POST") {
            return;
        }

        pjaxLoad(url, true, method, data);

        return false;
    }

    doc.on("submit", "form" + ignore, pjaxRequest);
    doc.on("click",  "a" + ignore, pjaxRequest);
})(window, document);
