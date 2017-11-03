/*
 * Pjax.js 0.5.3
 *
 * Copyright (c) 2017 Guilherme Nascimento (brcontainer@yahoo.com.br)
 *
 * Released under the MIT license
 */

(function (d, w, u) {
    "use strict";

    var
        xhr, config, timer, loader, cDone, cFail, cEl,
        h = w.history,
        URL = w.URL,
        domp = !!w.DOMParser,
        evts = {},
        docim = d.implementation,
        host = w.location.protocol.replace(/:/g, "") + "://" + w.location.host,
        inputRe = /^(input|textarea|select|datalist|button|output)$/i,
        started = false,
        m = w.Element && w.Element.prototype
    ;

    w.Pjax = {
        "supported": !!(m && h.pushState && (domp || (docim && docim.createHTMLDocument))),
        "remove": remove,
        "start": start,
        "request": function (url, cfg) {
            pjaxLoad(url, cfg.replace ? 2 : 1, cfg.method, null, cfg.data);
        },
        "on": function (name, callback) {
            pjaxEvent(name, callback);
        },
        "off": function (name, callback) {
            pjaxEvent(name, callback, true);
        }
    };

    if (domp) {
        try {
            var test = parseHtml('<html><head><title>1</title></head><body>1</body></html>');
            domp = !!(test.head && test.title && test.body);
        } catch (ee) {
            domp = false;
        }
    }

    function showLoader() {
        if (timer) {
            clearTimeout(timer);
            timer = 0;
            loader.className = "pjax-loader pjax-hide";
            setTimeout(showLoader, 20);
            return;
        }

        if (!loader) {
            loader = d.createElement("div");
            loader.innerHTML = '<div class="pjax-progress"></div>';
            d.body.appendChild(loader);
        }

        loader.className = "pjax-loader pjax-start";

        timer = setTimeout(function () {
            timer = 0;
            loader.className += " pjax-inload";
        }, 10);
    }

    function hideLoader() {
        if (timer) clearTimeout(timer);

        loader.className += " pjax-end";

        timer = setTimeout(function () {
            timer = 0;
            loader.className += " pjax-hide";
        }, 1000);
    }

    function serialize(form) {
        var data = [];

        [].slice.call(form.querySelectorAll("[name]")).forEach(function (el) {
            if (el.name && inputRe.test(el.tagName)) {
                data.push(encodeURIComponent(el.name) + "=" + encodeURIComponent(el.value));
            }
        });

        return data.join("&");
    }

    function parseHtml(data) {
        if (domp) return (new DOMParser).parseFromString(data, "text/html");

        var pd = docim.createHTMLDocument("");

        if (/^(\s+|)(<(\!doctype|html)(\s+|\s[\s\S]+|)>)/i.test(data)) {
            pd.documentElement.innerHTML = data;

            if (!pd.body || !pd.head) {
                pd = docim.createHTMLDocument("");
                pd.write(data);
            }
        } else {
            pd.body.innerHTML = data;
        }

        return pd;
    }

    function pjaxUpdateHead(head) {
        var i, index, frag, nodes = [], j = head.children;

        for (i = j.length - 1; i >= 0; i--) {
            if (j[i].tagName !== "TITLE") nodes.push(j[i].outerHTML);
        }

        j = d.head.children;

        for (i = j.length - 1; i >= 0; i--) {
            if (j[i].tagName === "TITLE" || data(j[i], "resource")) continue;

            index = nodes.indexOf(j[i].outerHTML);

            if (index === -1) {
                j[i].parentNode.removeChild(j[i]);
            } else {
                nodes.splice(index, 1);
            }
        }

        frag = d.createElement("div");
        frag.innerHTML = nodes.join("");

        j = frag.children;

        for (i = j.length - 1; i >= 0; i--) {
            if (!data(j[i], "resource")) d.head.appendChild(j[i]);
        }

        frag = nodes = null;
    }

    function pjaxTrigger(name, arg1, arg2, arg3) {
        if (!evts[name]) return;

        for (var ce = evts[name], i = 0; i < ce.length; i++) ce[i](arg1, arg2, arg3);
    }

    function pjaxEvent(name, callback, re) {
        if (typeof callback !== "function") return;

        if (!evts[name]) evts[name] = [];

        var ce = evts[name];

        if (!re) {
            ce.push(callback);
            return;
        }

        var fr = [], i;

        for (i = ce.length - 1; i >= 0; i--) {
            if (ce[i] === callback) fr.push(i);
        }

        for (i = fr.length - 1; i >= 0; i--) ce.splice(fr[i], 1);
    }

    function pjaxParse(url, data, cfg, state) {
        var current, tmp = parseHtml(data);

        var title = tmp.title || "", s = cfg.containers,
            x = cfg.scrollLeft > 0 ? +cfg.scrollLeft : w.scrollX || w.pageXOffset,
            y = cfg.scrollTop > 0 ? +cfg.scrollTop : w.scrollY || w.pageYOffset;

        if (state) {
            var c = {
                "pjaxUrl": url,
                "pjaxData": data,
                "pjaxConfig": cfg
            };

            if (state === 1) {
                h.pushState(c, title, url);
            } else if (state === 2) {
                h.replaceState(c, title, url);
            }
        }

        if (evts.dom && pjaxTrigger("dom", url, tmp) === false) return;

        if (cfg.updatehead && tmp.head) pjaxUpdateHead(tmp.head);

        d.title = title;

        for (var i = s.length - 1; i >= 0; i--) {
            current = tmp.body.querySelector(s[i]);

            if (current) {
                [].slice.call(d.querySelectorAll(s[i])).forEach(function (el) {
                    el.innerHTML = current.innerHTML;
                });
            }
        }

        w.scrollTo(x, y);

        tmp = s = null;
    }

    function data(el, name) {
        var d = el.getAttribute("data-pjax-" + name), resp;

        if (d === "true" || d === "false") {
            return d === "true";
        } else if (!isNaN(d)) {
            return parseFloat(d);
        } else if (/^\[[\s\S]+\]$|^\{[^:]+[:][\s\S]+\}$/.test(d)) {
            try { resp = JSON.parse(d); } catch (e) {}
        }

        return resp || d;
    }

    function pjaxAttributes(el) {
        var current, c, v, cfg = JSON.parse(JSON.stringify(config)),
            attrs = [
                "containers", "updatecurrent", "updatehead", "loader",
                "scroll-left", "scroll-right", "done", "fail"
            ];

        if (!el) return cfg;

        for (var i = attrs.length - 1; i >= 0; i--) {
            current = attrs[i];

            v = data(el, current);

            if (v) {
                c = current.toLowerCase().replace(/-([a-z])/g, function (a, b) {
                    return b.toUpperCase();
                });

                cfg[c] = v;
            }
        }

        return cfg;
    }

    function pjaxDone(url, data, cfg, state) {
        pjaxParse(url, data, cfg, state);
        pjaxTrigger("done", url);
        pjaxTrigger("then", url);

        if (cDone) new Function(cDone).call(cEl);
    }

    function pjaxFail(url, status) {
        pjaxTrigger("fail", url, status);
        pjaxTrigger("then", url);

        if (cFail) new Function(cFail).call(cEl);
    }

    function pjaxAbort() {
        if (xhr) xhr.abort();
        cFail = cDone = u;
    }

    function pjaxNoCache(url) {
        var u, n = "_=" + (+new Date);

        if (!URL) {
            u = new URL(url);
        } else {
            u = d.createElement("a");
            u.href = url;
        }

        u.search += u.search ? ("&" + n) : ("?" + n);

        url = u.toString();
        u = null;

        return url;
    }

    function pjaxLoad(url, state, method, el, data) {
        pjaxAbort();

        var cfg = pjaxAttributes(el);

        cDone = cfg.done;
        cFail = cfg.fail;
        cEl = el;

        pjaxTrigger("initiate", url, cfg);

        if (evts.handler) {
            pjaxTrigger("handler", {
                "url": url,
                "state": state,
                "method": method,
                "element": el
            }, cfg, pjaxDone, pjaxFail);
            return;
        }

        var headers = {
            "X-PJAX-Container": cfg.containers.join(","),
            "X-PJAX-URL": url,
            "X-PJAX": "true"
        };

        var curl = config.proxy || url;

        if (config.nocache) curl = pjaxNoCache(url);

        xhr = new XMLHttpRequest;
        xhr.open(method, curl, true);

        for (var k in headers) xhr.setRequestHeader(k, headers[k]);

        xhr.onreadystatechange = function () {
            if (this.readyState !== 4) return;

            var status = this.status;

            if (status >= 200 && status < 300 || status === 304) {
                pjaxDone(url, this.responseText, cfg, state);
            } else {
                pjaxFail(url, status);
            }
        };

        xhr.send(data || "");
    }

    function pjaxLink(e) {
        if (e.button !== 0) return;

        var url, l, el = e.target;

        if (el.matches(config.linkSelector)) {
            url = el.href;
        } else {
            while (el = el.parentNode) {
                if (el.tagName === "A") l = el; break;
            }

            if (!l || !l.matches(config.linkSelector)) return;

            el = l;
            url = el.href;
        }

        pjaxRequest("GET", url, null, el, e);
    }

    function pjaxForm(e) {
        var url, data, method, el = e.target;

        if (!el.matches(config.formSelector)) return;

        method = String(el.method).toUpperCase();

        if (method === "POST" && !w.FormData) return;

        url = el.action;

        if (method !== "POST" || el.enctype !== "multipart/form-data") {
            data = serialize(el);

            if (method !== "POST") {
                url = url.replace(/\?.*/g, "") + "?";
                if (data) url += data;
                data = null;
            }
        } else if (w.FormData) {
            data = new FormData(el);
        } else {
            return;
        }

        pjaxRequest(method, url, data, el, e);
    }

    function pjaxRequest(method, url, data, el, e) {
        if (url.indexOf(host + "/") !== 0 && url !== host) return;

        e.preventDefault();

        if (url === w.location + "" && method !== "POST") {
            if (config.updatecurrent) pjaxLoad(url, 2, method, el, data);
            return;
        }

        pjaxLoad(url, 1, method, el, data);
    }

    function pjaxState(e) {
        if (!e.state || !e.state.pjaxUrl) return;

        pjaxAbort();
        pjaxParse(e.state.pjaxUrl, e.state.pjaxData, e.state.pjaxConfig, false);
        pjaxTrigger("history", e.state.pjaxUrl, e.state);
    }

    function ready() {
        if (started) return;

        started = false;

        var url = w.location + "", state = w.history.state;

        if (!state || !state.pjaxUrl) {
            h.replaceState({
                "pjaxUrl": url,
                "pjaxData": d.documentElement.outerHTML,
                "pjaxConfig": config
            }, d.title, url);
        }

        pjaxEvent("initiate", showLoader);
        pjaxEvent("then", hideLoader);

        w.addEventListener("unload", pjaxAbort);
        w.addEventListener("popstate", pjaxState);

        if (config.linkSelector) d.addEventListener("click", pjaxLink);
        if (config.formSelector) d.addEventListener("submit", pjaxForm);
    }

    function remove() {
        if (!config || !started) return;

        if (config.load) {
            pjaxEvent("initiate", showLoader, true);
            pjaxEvent("then", hideLoader, true);
        }

        d.removeEventListener("click", pjaxLink);
        d.removeEventListener("submit", pjaxForm);

        w.removeEventListener("unload", pjaxAbort);
        w.removeEventListener("popstate", pjaxState);

        started = false;
        config = u;
    }

    function start(opts) {
        if (!/^http(|s):$/.test(w.location.protocol) || !w.Pjax.supported) return;

        remove();

        config = {
            "linkSelector": "a:not([data-pjax-ignore]):not([href^='#']):not([href^='javascript:'])",
            "formSelector": "form:not([data-pjax-ignore]):not([action^='javascript:'])",
            "containers": [ "#pjax-container" ],
            "updatecurrent": false,
            "updatehead": true,
            "scrollLeft": 0,
            "scrollTop": 0,
            "nocache": false,
            "loader": true,
            "proxy": ""
        };

        for (var k in config) {
            if (opts && k in opts) config[k] = opts[k];
        }

        opts = null;

        if (/^(interactive|complete)$/.test(d.readyState)) {
            ready();
        } else {
            d.addEventListener("DOMContentLoaded", ready);
        }
    }

    if (!m || m.matches) return;

    m.matches = m.matchesSelector || m.mozMatchesSelector || m.msMatchesSelector ||
    m.oMatchesSelector || m.webkitMatchesSelector || function(s) {
        var m = (this.document || this.ownerDocument).querySelectorAll(s), i = m.length;

        while (--i >= 0 && m[i] !== this);
        return i > -1;
    };
})(document, window);
