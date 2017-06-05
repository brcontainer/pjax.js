/*
 * auto-pjax.js 0.1.2
 *
 * Copyright (c) 2017 Guilherme Nascimento (brcontainer@yahoo.com.br)
 *
 * Released under the MIT license
 */

(function (d, w, $) {
    "use strict";

    if (!w.history.pushState || !w.DOMParser || !/^http(|s):$/.test(w.location.protocol)) {
        $.autoPjax = function () {};
        return;
    }

    var config, xhr, timer, loader, doc = $(d), started = false,
        host = w.location.protocol.replace(/:/g, "") + "://" + w.location.host;

    function isUnsigned(value) {
        return /^\d+$/.test(value);
    }

    function showLoader() {
        if (timer) clearTimeout(timer);

        if (!loader) {
            loader = $('<div class="pjax-loader pjax-hide"><div class="pjax-progress"></div></div>');
            $(loader).insertBefore("body");
        }

        loader.removeClass("pjax-hide");
        loader.removeClass("pjax-end");
        loader.addClass("pjax-start");

        timer = setTimeout(function () {
            loader.addClass("pjax-inload");
        }, 10);
    }

    function hideLoader() {
        if (timer) clearTimeout(timer);

        loader.addClass("pjax-end");

        timer = setTimeout(function () {
            loader.removeClass("pjax-inload");
            loader.addClass("pjax-hide");
        }, 1000);
    }

    function pjaxUpdateHead(head) {
        var nodes = [], content, index;

        $("*", head).each(function () {
            if (this.tagName !== "TITLE") {
                nodes.push(this.outerHTML);
            }
        });

        $("*", d.head).each(function () {
            if (this.tagName !== "TITLE") {
                content = this.outerHTML;

                index = nodes.indexOf(content);

                if (index === -1) {
                    $(this).remove();
                } else {
                    nodes.splice(index, 1);
                }
            }
        });

        for (var i = 0, j = nodes.length; i < j; i++) {
            $(nodes[i]).appendTo("head");
        }
    }

    function pjaxAttributes(el) {
        var current, cc, val,
            cfg = $.extend(config, {}),
            attrs = [ "selectors", "updatehead", "loader", "scroll-left", "scroll-right" ];

        for (var i = attrs.length - 1; i >= 0; i--) {
            current = attrs[i];

            val = el.data("pjax-" + current);

            if (val) {
                cc = current.toLowerCase().replace(/\-([a-z])/g, function (a, b) {
                    return b.toUpperCase();
                });

                cfg[cc] = val;
            }
        }

        return cfg;
    }

    function pjaxParse(url, data, cfg, state) {
        var tmp = (new DOMParser).parseFromString(data, "text/html"),
            title = tmp.title || "",
            s = cfg.selectors;

        if (state) {
            var c = {
                "pjaxUrl": url,
                "pjaxData": data,
                "pjaxConfig": cfg
            };

            if (state === 1) {
                w.history.pushState(c, title, url.substring(host.length));
            } else {
                w.history.replaceState(c, title, url.substring(host.length));
            }
        }

        if (config.updatehead) pjaxUpdateHead(tmp.head);

        if (cfg.title) {
            doc.title = title;
        }

        for (var i = 0, j = s.length; i < j; i++) {
            $(s[i]).html( $(s[i], tmp.body).html() || "" );
        }

        if (isUnsigned(cfg.scrollLeft)) doc.scrollLeft(cfg.scrollLeft);
        if (isUnsigned(cfg.scrollTop)) doc.scrollTop(cfg.scrollTop);

        tmp = s = null;
    }

    function pjaxLoad(url, state, method, el, data, noprocess) {
        if (xhr) xhr.abort();

        var cfg = pjaxAttributes($(el));

        doc.trigger("pjax.initiate", [url, cfg]);

        var opts = {
            "dataType": "text",
            "headers": {
                "X-PJAX-Container": cfg.selectors.join(","),
                "X-PJAX-URL": url,
                "X-PJAX": "true"
            }
        };

        if (method && data) {
            opts.data = data;
            opts.type = method;

            if (noprocess) opts.processData = false;
        }

        opts.url = url;

        xhr = $.ajax(opts).done(function (resp) {
            pjaxParse(url, resp, cfg, state);
            doc.trigger("pjax.done", [url]);
            doc.trigger("pjax.then", [url]);
        }).fail(function (xhr, status, error) {
            doc.trigger("pjax.fail", [url, status, error]);
            doc.trigger("pjax.then", [url]);
        });
    }

    function pjaxRequest(e) {
        var method, data, noprocess = false,
            url = this.nodeName === "FORM" ? this.action : this.href;

        if (url.indexOf(host) !== 0) {
            return;
        }

        if (this.nodeName === "FORM") {
            method = String(this.method).toUpperCase();

            if (method === "POST" && !w.FormData) {
                return;
            }

            if (method !== "POST" || this.enctype !== "multipart/form-data") {
                data = $(this).serialize();

                if (method !== "POST") {
                    url = url.replace(/\?.*/g, "");
                    if (data) url += "?" + data;
                    data = null;
                }
            } else if (w.FormData) {
                data = new FormData(this);
                noprocess = true;
            } else {
                return;
            }
        }

        e.preventDefault();

        if (url === String(w.location) && method !== "POST") {
            return false;
        }

        pjaxLoad(url, 1, method, this, data, noprocess);

        return false;
    }

    function restoreState (e) {
        if (e.state && e.state.pjaxUrl) {
            pjaxParse(e.state.pjaxUrl, e.state.pjaxData, e.state.pjaxConfig, false);
        } else {
            pjaxLoad(String(w.location), 2);
        }
    }

    $.autoPjax = function (opts) {
        var ignoreform = ":not([data-pjax-ignore]):not([action^='javascript:'])";
        var ignorelink = ":not([data-pjax-ignore]):not([href^='#']):not([href^='javascript:'])";

        if (opts === "remove") {
            if (config) {
                return;
            }

            if (config.load) {
                doc.off("pjax.initiate", showLoader);
                doc.off("pjax.then", hideLoader);
            }

            doc.off("submit", "form" + ignoreform, pjaxRequest);
            doc.off("click",  "a" + ignorelink, pjaxRequest);

            w.removeEventListener("popstate", restoreState);

            return;
        }

        config = $.extend({
            "selectors": [ "#pjax-container" ],
            "updatehead": true,
            "scrollLeft": 0,
            "scrollTop": 0,
            "loader": true
        }, opts);

        if (config.loader) {
            doc.on("pjax.initiate", showLoader);
            doc.on("pjax.then", hideLoader);
        }

        doc.on("submit", "form" + ignoreform, pjaxRequest);
        doc.on("click",  "a" + ignorelink, pjaxRequest);

        var url = String(w.location);

        w.addEventListener("popstate", restoreState);

        $(function () {
            w.history.replaceState({
                "pjaxUrl": url,
                "pjaxData": d.documentElement.outerHTML,
                "pjaxConfig": config
            }, d.title, url.substring(host.length));
        });
    };
})(document, window, window.jQuery);
