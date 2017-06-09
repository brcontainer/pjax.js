/*
 * Pjax.js 0.3.0
 *
 * Copyright (c) 2017 Guilherme Nascimento (brcontainer@yahoo.com.br)
 *
 * Released under the MIT license
 */

(function (d, w, m, u) {
    "use strict";

    w.Pjax = {
        "supported": !w.history.pushState || !(w.DOMParser || d.implementation.createHTMLDocument),
        "remove": remove,
        "start": start,
        "on": function (name, callback) {
            pjaxEvent(name, callback);
        },
        "off": function (name, callback) {
            pjaxEvent(name, callback, true);
        }
    };

    var
        xhr, config, timer, loader, evts = {},
        host = w.location.protocol.replace(/:/g, "") + "://" + w.location.host,
        inputRe = /^(input|textarea|select|datalist|button|output)$/i,
        formv = "form:not([data-pjax-ignore]):not([action^='javascript:'])",
        linkv = "a:not([data-pjax-ignore]):not([href^='#']):not([href^='javascript:'])"
    ;

    function isUnsigned(value) {
        return /^\d+$/.test(value);
    }

    function showLoader() {
        if (timer) clearTimeout(timer);

        if (!loader) {
            loader = d.createElement("div");
            loader.className = "pjax-loader pjax-hide";
            loader.innerHTML = '<div class="pjax-progress"></div>';
            d.body.appendChild(loader);
        }

        loader.classList.remove("pjax-hide");
        loader.classList.remove("pjax-end");
        loader.classList.add("pjax-start");

        timer = setTimeout(function () {
            loader.classList.add("pjax-inload");
        }, 10);
    }

    function hideLoader() {
        if (timer) clearTimeout(timer);

        loader.classList.add("pjax-end");

        timer = setTimeout(function () {
            loader.classList.remove("pjax-inload");
            loader.classList.add("pjax-hide");
        }, 1000);
    }

    function serialize(el) {
        var data = [];

        [].slice.call(el.querySelectorAll("[name]")).forEach(function (el) {
            if (el.name && inputRe.test(el.taName)) {
                data.push(encodeURIComponent(el.name) + "=" + encodeURIComponent(el.value));
            }
        });

        return data.join("&");
    }

    function parseHtml(data) {
        if (w.DOMParser) {
            return (new DOMParser).parseFromString(data, "text/html");
        }

        var pd = d.implementation.createHTMLDocument("");

        if (data.toLowerCase().indexOf('<!doctype') !== -1) {
            pd.documentElement.innerHTML = data;
        } else {
            pd.body.innerHTML = data;
        }

        return pd;
    }

    function pjaxUpdateHead(head) {
        var i, index, frag, nodes = [], j = head.childNodes;

        for (i = j.length - 1; i >= 0; i--) {
            if (j[i].tagName !== "TITLE") nodes.push(j[i].outerHTML);
        }

        j = d.head.childNodes;

        for (i = j.length - 1; i >= 0; i--) {
            if (j[i].tagName === "TITLE") continue;

            index = nodes.indexOf(j[i].outerHTML);

            if (index === -1) {
                j[i].parentNode.removeChild(j[i]);
            } else {
                nodes.splice(index, 1);
            }
        }

        frag = d.createElement("div");
        frag.innerHTML = nodes.join("");

        j = frag.childNodes;

        for (i = j.length - 1; i >= 0; i--) d.head.appendChild(j[i]);

        frag = nodes = null;
    }

    function pjaxTrigger(name, arg1, arg2) {
        if (!evts[name]) return;

        for (var ce = evts[name], i = 0; i < ce.length; i++) ce[i](arg1, arg2);
    }

    function pjaxEvent(name, callback, remove) {
        if (typeof callback !== "function") return;

        if (!evts[name]) evts[name] = [];

        var ce = evts[name];

        if (!remove) {
            ce.push(callback);
            return;
        }

        var fr = [];

        for (var i = ce.length - 1; i >= 0; i--) {
            if (ce[i] === callback) fr.push(i);
        }

        for (var i = fr.length - 1; i >= 0; i--) ce.splice(fr[i], 1);
    }

    function pjaxParse(url, data, cfg, state) {
        var current, tmp = parseHtml(data), title = tmp.title || "", s = cfg.containers,
            x = isUnsigned(cfg.scrollLeft) ? cfg.scrollLeft : w.scrollX || w.pageXOffset,
            y = isUnsigned(cfg.scrollTop) ? cfg.scrollTop : w.scrollY || w.pageYOffset;

        if (state) {
            var c = {
                "pjaxUrl": url,
                "pjaxData": data,
                "pjaxConfig": cfg
            };

            if (state === 1) {
                w.history.pushState(c, title, url.substring(host.length));
            } else if (state === 2) {
                w.history.replaceState(c, title, url.substring(host.length));
            }
        }

        if (config.updatehead) pjaxUpdateHead(tmp.head);

        if (title) d.title = title;

        for (var i = 0, j = s.length; i < j; i++) {
            var els = d.querySelectorAll(s[i]);

            for (var x = 0, z = els.length; x < z; x++) {
                current = tmp.body.querySelector(s[i]);
                if (current) els[0].innerHTML = current.innerHTML;
            }
        }

        w.scrollTo(x, y);

        tmp = s = null;
    }

    function data(el, name) {
        var d = el.getAttribute(name), resp;

        if (d === "true" || d === "false") {
            resp = d === "true";
        } else if (/^\[*.?\]$|^\{*.?\}$/.test(d)) {
            try { resp = JSON.parse(d); } catch (e) {}
        }

        return resp || d;
    }

    function pjaxAttributes(el) {
        var current, c, v, cfg = JSON.parse(JSON.stringify(config)),
            attrs = [
                "containers", "updatecurrent", "updatehead", "loader",
                "scroll-left", "scroll-right", "then", "done", "fail"
            ];

        for (var i = attrs.length - 1; i >= 0; i--) {
            current = attrs[i];

            v = data(el, "pjax-" + current);

            if (v) {
                c = current.toLowerCase().replace(/\-([a-z])/g, function (a, b) {
                    return b.toUpperCase();
                });

                cfg[c] = v;
            }
        }

        return cfg;
    }

    function pjaxAbort() {
        if (xhr) xhr.abort();
    }

    function pjaxLoad(url, state, method, el, data) {
        pjaxAbort();

        var cfg = pjaxAttributes(el);

        pjaxTrigger("initiate", url, cfg);

        var headers = {
            "X-PJAX-Container": cfg.containers.join(","),
            "X-PJAX-URL": url,
            "X-PJAX": "true"
        };

        xhr = new XMLHttpRequest;
        xhr.open(method, url, true);

        for (var k in headers) {
            xhr.setRequestHeader(k, headers[k]);
        }

        xhr.onreadystatechange = function () {
            if (this.readyState === 4) {
                var status = this.status;

                if (status >= 200 && status < 300 || status === 304) {
                    pjaxParse(url, this.responseText, cfg, state);
                    pjaxTrigger("done", url);
                } else {
                    pjaxTrigger("fail", url, status);
                }

                pjaxTrigger("then", url);
            }
        };

        xhr.send(data || "");
    }

    function pjaxRequest(e) {
        var url, link, method = "GET", data = null, noprocess = false, el = e.target;

        if (el.matches(formv)) {
            url = el.action;
        } else if (el.matches(linkv)) {
            url = el.href;
        } else {
            e.preventDefault();

            while (el.parentNode) {
                el = el.parentNode;
                if (el.tagName === "A") link = el; break;
            }

            if (!link) return;

            el = link;
            url = el.href;
        }

        if (url.indexOf(host + "/") !== 0 && url !== host) return;

        if (el.nodeName === "FORM") {
            method = String(el.method).toUpperCase();

            if (method === "POST" && !w.FormData) return;

            if (method !== "POST" || el.enctype !== "multipart/form-data") {
                data = serialize(el);

                if (method !== "POST") {
                    url = url.replace(/\?.*/g, "");
                    if (data) url += "?" + data;
                    data = null;
                }
            } else if (w.FormData) {
                data = new FormData(el);
            } else {
                return;
            }
        }

        e.preventDefault();

        if (url === String(w.location) && method !== "POST") {
            if (config.updatecurrent) pjaxLoad(url, 2, method, el, data);

            return false;
        }

        pjaxLoad(url, 1, method, el, data);

        return false;
    }

    function pjaxState(e) {
        if (e.state && e.state.pjaxUrl) {
            pjaxAbort();
            pjaxParse(e.state.pjaxUrl, e.state.pjaxData, e.state.pjaxConfig, false);
        } else {
            pjaxLoad(String(w.location), 2);
        }
    }

    function start(opts) {
        if (!/^http(|s):$/.test(w.location.protocol)) return;

        config = {
            "containers": [ "#pjax-container" ],
            "updatecurrent": false,
            "updatehead": true,
            "scrollLeft": 0,
            "scrollTop": 0,
            "loader": true
        };

        for (var k in config) {
            if (opts && opts[k]) config[k] = opts[k];
        }

        opts = null;

        pjaxEvent("initiate", showLoader);
        pjaxEvent("then", hideLoader);

        w.addEventListener("unload", pjaxAbort);
        w.addEventListener("popstate", pjaxState);

        d.addEventListener("click", pjaxRequest);
        d.addEventListener("submit", pjaxRequest);

        if (/^(interactive|complete)$/i.test(d.readyState)) {
            ready();
        } else {
            d.addEventListener("DOMContentLoaded", ready);
        }
    }

    if (!m.matches) {
        m.matches = m.matchesSelector || m.mozMatchesSelector || m.msMatchesSelector ||
        m.oMatchesSelector || m.webkitMatchesSelector || function(s) {
            var m = (this.document || this.ownerDocument).querySelectorAll(s), i = m.length;

            while (--i >= 0 && m[i] !== this);
            return i > -1;
        };
    }

    function ready() {
        var url = String(w.location);

        w.history.replaceState({
            "pjaxUrl": url,
            "pjaxData": d.documentElement.outerHTML,
            "pjaxConfig": config
        }, d.title, url.substring(host.length));
    }

    function remove() {
        if (!config) return;

        if (config.load) {
            pjaxEvent("initiate", showLoader, true);
            pjaxEvent("then", hideLoader, true);
        }

        d.removeEventListener("click", pjaxRequest);
        d.removeEventListener("submit", pjaxRequest);

        w.removeEventListener("unload", pjaxAbort);
        w.removeEventListener("popstate", pjaxState);
    }
})(document, window, Element.prototype);
