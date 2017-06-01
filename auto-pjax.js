/*
 * auto-pjax.js 0.0.5
 *
 * Copyright (c) 2017 Guilherme Nascimento (brcontainer@yahoo.com.br)
 *
 * Released under the MIT license
 */

(function (d, w, $) {
    "use strict";

    if (!w.history.pushState || !w.DOMParser || !/^http(|s):$/.test(w.location.protocol)) {
        return;
    }

    var pjax, xhr, container, loader, progress, updateHead, autoscroll, rootdoc,
        doc = $(d), head = $(d.head), host = w.location.protocol.replace(/:/g, "") + "://" + w.location.host;

    var timerProgress;

    function showProgress(show) {
        if (timerProgress) clearTimeout(timerProgress);

        if (show) {
            progress.css({ "display": "block", "width": "0%", "opacity": "1" });

            timerProgress = setTimeout(function () {
                progress.css("width", "90%");
            }, 1);
        } else {
            progress.css({ "opacity": "0", "width": "100%" });

            timerProgress = setTimeout(function () {
                progress.css("display", "none");
            }, 1010);
        }
    }

    function updateContainer(url, data, changestate)
    {
        var tmp = (new DOMParser).parseFromString(data, "text/html");

        $(':focus').blur();

        var title = $("title", tmp).text() || "";

        if (changestate) {
            w.history.pushState({
                "pjaxUrl": url,
                "pjaxData": data
            }, title, url.substring(host.length));
        }

        //Update head
        if (updateHead) {
            head.html($(tmp.head).html());
        }

        //Update title
        d.title = title;

        //Update container
        container.html( $(".pjax-container", tmp).html() || "" );

        if (autoscroll && rootdoc) {
            rootdoc.scrollLeft(0);
            rootdoc.scrollTop(0);
        }

        tmp = null;

        showProgress(false);

        doc.trigger("pjax.done", [url]);
    }

    function pjaxLoad(url, method, data)
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
            updateContainer(url, data, true, 0, 0);
        }).fail(function (xhr, status, error) {
            showProgress(false);

            doc.trigger("pjax.fail", [url, status, error]);
        });
    }

    w.addEventListener("popstate", function (e) {
        if (e.state && e.state.pjaxUrl) {
            updateContainer(e.state.pjaxUrl, e.state.pjaxData, false);
        } else {
            pjaxLoad(String(w.location));
        }
    });

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

        pjaxLoad(url, method, data);

        return false;
    }

    $.autoPjax = function (opts) {
        opts = $.extend({
            "updateHead": false,
            "autoscroll": true,
            "root": $(window)
        }, opts || {});

        rootdoc = opts.root;
        updateHead = !!opts.updateHead;
        autoscroll = !!opts.autoscroll;

        var ignore = ":not([data-pjax-ignore]):not([href^='#']):not([href^='javascript:'])";

        doc.on("submit", "form" + ignore, pjaxRequest);
        doc.on("click",  "a" + ignore, pjaxRequest);

        var firstUrl = String(window.location),
            source = document.documentElement.outerHTML;

        if (!source) {
            return;
        }

        $(function () {
            w.history.replaceState({
                "pjaxUrl": firstUrl,
                "pjaxData": source
            }, document.title, firstUrl.substring(host.length));
        });
    };
})(document, window, window.jQuery);
