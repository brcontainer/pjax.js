/*
 * Pjax.js 0.6.7
 *
 * Copyright (c) 2023 Guilherme Nascimento (brcontainer@yahoo.com.br)
 *
 * Released under the MIT license
 */

(function () {
    "use strict";

    var xhr, config, timer, loader, undef,
        win = typeof window !== "undefined" ? window : {},
        doc = win.document || {},
        history = win.history,
        domparser = !!win.DOMParser,
        formdata = !!win.FormData,
        urlparams = !!win.URLSearchParams,
        evts = {},
        docImplementation = doc.implementation,
        location = win.location,
        origin = location ? (location.protocol + "//" + location.host) : "",
        started = false,
        elementProto = win.Element && win.Element.prototype,
        ArraySlice = [].slice,
        PUSH = 1,
        REPLACE = 2,
        supported = !!(
            elementProto && history.pushState && (
                domparser || (docImplementation && docImplementation.createHTMLDocument)
            )
        ),
        attrs = [
            { attr: "containers", cfg: "containers" },
            { attr: "updatecurrent", cfg: "updatecurrent" },
            { attr: "updatehead", cfg: "updatehead" },
            { attr: "insertion", cfg: "insertion" },
            { attr: "loader", cfg: "loader" },
            { attr: "scroll-left", cfg: "scrollLeft" },
            { attr: "scroll-top", cfg: "scrollTop" },
            { attr: "done", cfg: "done" },
            { attr: "fail", cfg: "fail" }
        ];

    var main = {
        supported: supported,
        remove: remove,
        start: start,
        request: function (url, cfg) {
            if (started) {
                pjaxLoad(url, cfg.replace ? REPLACE : PUSH, cfg.method, cfg.data, undef, config);
            }
        },
        on: function (name, callback) {
            pjaxEvent(name, callback);
        },
        off: function (name, callback) {
            pjaxEvent(name, callback, true);
        }
    };

    var tests;

    if (domparser) {
        try {
            tests = parseHtml("<html><head><title>1</title></head><body>1</body></html>");
            domparser = !!(tests.head && tests.title && tests.body);
        } catch (e) {
            domparser = false;
        }
    }

    if (urlparams) {
        try {
            tests = new FormData;
            tests.append("a", "1");
            urlparams = serialize(tests) === "a=1";
        } catch (e) {
            urlparams = false;
        }
    }

    function showLoader()
    {
        if (timer) {
            clearTimeout(timer);
            timer = 0;
            loader.className = "pjax-loader pjax-hide";
            setTimeout(showLoader, 20);
            return;
        }

        if (!loader) {
            loader = doc.createElement("div");
            loader.innerHTML = '<div class="pjax-progress"></div>';
            doc.body.appendChild(loader);
        }

        loader.className = "pjax-loader pjax-start";

        timer = setTimeout(function () {
            timer = 0;
            loader.className += " pjax-inload";
        }, 10);
    }

    function hideLoader()
    {
        if (timer) clearTimeout(timer);

        loader.className += " pjax-end";

        timer = setTimeout(function () {
            timer = 0;
            loader.className += " pjax-hide";
        }, 1000);
    }

    function selectorEach(context, query, callback)
    {
        ArraySlice.call(query ? context.querySelectorAll(query) : context).forEach(callback);
        callback = undef;
    }

    function parseHtml(data)
    {
        if (domparser) return new DOMParser().parseFromString(data, "text/html");

        var pd = docImplementation.createHTMLDocument("");

        if (/^\s*<(\!doctype|html)[^>]*>/i.test(data)) {
            pd.documentElement.innerHTML = data;

            if (!pd.body || !pd.head) {
                pd = docImplementation.createHTMLDocument("");
                pd.write(data);
            }
        } else {
            pd.body.innerHTML = data;
        }

        return pd;
    }

    function pjaxUpdateHead(tmp)
    {
        var index, frag, nodes = [], dHead = doc.head;

        selectorEach(tmp.head.children, undef, function (el) {
            if (el.tagName !== "TITLE") {
                nodes.push(el.outerHTML);
            }
        });

        selectorEach(dHead.children, undef, function (el) {
            if (el.tagName === "TITLE" || getData(el, "resource")) {
                index = nodes.indexOf(el.outerHTML);

                if (index === -1) {
                    el.parentNode.removeChild(el);
                } else {
                    nodes.splice(index, 1);
                }
            }
        });

        frag = tmp.createElement("div");
        frag.innerHTML = nodes.join("");

        selectorEach(frag.children, undef, function (el) {
            if (!getData(el, "resource")) {
                dHead.appendChild(el);
            }
        });

        frag = nodes = undef;
    }

    function pjaxTrigger(name, arg1, arg2, arg3)
    {
        var ref = evts[name];

        if (ref) {
            for (var i = 0, j = ref.length; i < j; i++) {
                ref[i](arg1, arg2, arg3);
            }
        }
    }

    function pjaxEvent(name, callback, remove)
    {
        if (typeof callback === "function") {
            if (!evts[name]) evts[name] = [];

            var ref = evts[name];

            if (remove) {
                var index = ref.indexOf(callback);

                if (index > -1) {
                    ref.splice(index, 1);
                }
            } else {
                ref.push(callback);
            }
        }
    }

    function pjaxParse(url, data, cfg, state)
    {
        var current,
            containers = cfg.containers,
            tmp = data && parseHtml(data),
            body = tmp && tmp.body;

        if (!body || !body.querySelectorAll(containers.join(",")).length) {
            return "No such containers";
        }

        var info = {
            pjaxUrl: url,
            pjaxData: data,
            pjaxConfig: cfg
        };

        if (state === PUSH) {
            history.pushState(info, "", url);
        } else if (state === REPLACE) {
            history.replaceState(info, "", url);
        }

        if (evts.dom) return pjaxTrigger("dom", url, tmp);

        var insertion = cfg.insertion,
            scrollX = cfg.scrollLeft > -1 ? +cfg.scrollLeft : (win.scrollX || win.pageXOffset),
            scrollY = cfg.scrollTop > -1 ? +cfg.scrollTop : (win.scrollY || win.pageYOffset);

        if (cfg.updatehead && tmp.head) pjaxUpdateHead(tmp);

        doc.title = tmp.title || "";

        for (var i = containers.length - 1; i >= 0; i--) {
            current = body.querySelector(containers[i]);

            if (current) {
                selectorEach(doc, containers[i], function (el) {
                    if (insertion === "append" || insertion === "prepend") {
                        var fragment = doc.createDocumentFragment();

                        selectorEach(current.childNodes, undef, function (el) {
                            fragment.appendChild(el);
                        });

                        if (insertion === "append") {
                            el.appendChild(fragment);
                        } else {
                            el.insertBefore(fragment, el.firstChild);
                        }

                        fragment = undef;
                    } else {
                        el.innerHTML = current.innerHTML;
                    }
                });
            }
        }

        win.scrollTo(scrollX, scrollY);

        tmp = containers = undef;
    }

    function getData(el, name)
    {
        var data = el.getAttribute("data-pjax-" + name);

        if (data === "true" || data === "false") return data === "true";

        if (!data) return "";

        if (!isNaN(data)) return parseFloat(data);

        if (data.length > 3) {
            var l = data[0], r = data[data.length - 1];

            if ((l === "[" && r === "]") || (l === "{" && r === "}")) {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error("Invalid value in data-pjax-" + name + " attribute on element:", el);
                }
            }
        }

        return data;
    }

    function pjaxAttributes(el)
    {
        var current, value, cfg = JSON.parse(JSON.stringify(config));

        if (el) {
            for (var i = attrs.length - 1; i >= 0; i--) {
                current = attrs[i];

                value = getData(el, current.attr);

                if (value !== "") cfg[current.cfg] = value;
            }
        }

        return cfg;
    }

    function pjaxResolve(url, cfg, state, el, callback, data, status, error)
    {
        if (cfg.loader) hideLoader();

        if (!error) error = pjaxParse(url, data, cfg, state);

        pjaxTrigger(error ? "fail" : "done", url, status, error);

        pjaxTrigger("then", url);

        if (callback) new Function(callback).call(el);
    }

    function pjaxAbort()
    {
        if (xhr) xhr.abort();
    }

    function pjaxNoCache(url)
    {
        var extra = "_=" + (+new Date);
        return url + (url.indexOf("?") === -1 ? "?" : "&") + extra;
    }

    function pjaxLoad(url, state, method, data, el, cfg)
    {
        pjaxAbort();

        pjaxTrigger("initiate", url, cfg);

        if (cfg.loader) showLoader();

        if (evts.handler) {
            return pjaxTrigger("handler", {
                url: url,
                state: state,
                method: method,
                element: el
            }, function (content) {
                pjaxResolve(url, cfg, state, el, cfg.done, content, 0, undef);
            }, function (error) {
                pjaxResolve(url, cfg, state, el, cfg.fail, "", -1, error);
            });
        }

        var reqUrl = url, headers = cfg.headers;

        headers["X-PJAX-Container"] = cfg.containers.join(",");
        headers["X-PJAX"] = "true";

        if (cfg.proxy) reqUrl = cfg.proxy + encodeURIComponent(reqUrl);

        if (cfg.nocache) reqUrl = pjaxNoCache(reqUrl);

        xhr = new XMLHttpRequest;

        xhr.open(method, reqUrl, true);

        for (var k in headers) {
            xhr.setRequestHeader(k, headers[k]);
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var status = xhr.status;

                if (status >= 200 && status < 300) {
                    var containers = xhr.getResponseHeader("X-PJAX-Container");

                    if (containers) cfg.containers = containers.split(",");

                    pjaxResolve(xhr.getResponseHeader("X-PJAX-URL") || url, cfg, state, el, cfg.done, xhr.responseText, status, undef);
                } else {
                    pjaxResolve(url, cfg, state, el, cfg.fail, "", status, "HTTP Error (" + status + ")");
                }
            }
        };

        xhr.send(data || "");
    }

    function pjaxLink(event)
    {
        if (event.button === 0) {
            var url, el = event.target;

            while (el.tagName && el.tagName !== "A") {
                el = el.parentNode;
            }

            url = el.href;

            if (url && el.matches(config.linkSelector) && sameWindowOrigin(el.target, url)) {
                pjaxRequest("GET", url, undef, el, event, pjaxAttributes(el));
            }
        }
    }

    function pjaxForm(event)
    {
        var el = event.target, url = el.action;

        if (formdata && el.matches(config.formSelector) && sameWindowOrigin(el.target, url)) {
            var data = new FormData(el),
                method = String(el.method).toUpperCase(),
                enctype = el.enctype,
                cfg = pjaxAttributes(el);

            if (method !== "POST") method = "GET";

            if (method === "GET" || enctype !== "multipart/form-data") {
                if (!urlparams) return;

                data = serialize(data);

                if (method === "GET") {
                    url = url.replace(/\?[\s\S]+/, "") + "?" + data;
                } else if (enctype === "text/plain") {
                    data = data.replace(/&/g, "\n");
                    cfg.headers["Content-Type"] = enctype;
                }
            }

            pjaxRequest(method, url, data, el, event, cfg);

            data = undef;
        }
    }

    function serialize(data)
    {
        return new URLSearchParams(data) + "";
    }

    function pjaxRequest(method, url, data, el, event, cfg)
    {
        event.preventDefault();

        var mode = cfg.updatecurrent || url === location + "" ? REPLACE : PUSH;

        pjaxLoad(url, mode, method, data, el, cfg);
    }

    function pjaxState(e)
    {
        if (e.state && e.state.pjaxUrl) {
            pjaxAbort();
            pjaxParse(e.state.pjaxUrl, e.state.pjaxData, e.state.pjaxConfig, undef);
            pjaxTrigger("history", e.state.pjaxUrl, e.state);
        }
    }

    function ready()
    {
        if (!started) {
            started = true;

            var url = location + "";

            history.replaceState({
                pjaxUrl: url,
                pjaxData: doc.documentElement.outerHTML,
                pjaxConfig: config
            }, "", url);

            win.addEventListener("unload", pjaxAbort);
            win.addEventListener("popstate", pjaxState);

            if (config.linkSelector) doc.addEventListener("click", pjaxLink);
            if (config.formSelector) doc.addEventListener("submit", pjaxForm);
        }
    }

    function remove()
    {
        if (config && started) {
            doc.removeEventListener("click", pjaxLink);
            doc.removeEventListener("submit", pjaxForm);

            win.removeEventListener("unload", pjaxAbort);
            win.removeEventListener("popstate", pjaxState);

            started = false;
            config = undef;
        }
    }

    function sameWindowOrigin(target, url) {
        target = target.toLowerCase();

        return (
            !target ||
            target === win.name ||
            target === "_self" ||
            (target === "_top" && w === win.top) ||
            (target === "_parent" && w === win.parent)
        ) && (
            url === origin ||
            url.indexOf(origin) === 0
        );
    }

    function start(opts)
    {
        if (supported && /^https?:$/.test(location.protocol)) {
            remove();

            config = {
                linkSelector: "a:not([data-pjax-ignore]):not([href^='#']):not([href^='javascript:'])",
                formSelector: "form:not([data-pjax-ignore]):not([action^='javascript:'])",
                containers: [ "#pjax-container" ],
                updatecurrent: false,
                updatehead: true,
                insertion: undef,
                proxy: undef,
                scrollLeft: 0,
                scrollTop: 0,
                nocache: false,
                loader: true,
                headers: {}
            };

            for (var k in config) {
                if (opts && k in opts) config[k] = opts[k];
            }

            opts = undef;

            if (/^(interactive|complete)$/.test(doc.readyState)) {
                ready();
            } else {
                doc.addEventListener("DOMContentLoaded", ready);
            }
        }
    }

    if (elementProto && !elementProto.matches) {
        elementProto.matches = elementProto.matchesSelector || elementProto.mozMatchesSelector || elementProto.msMatchesSelector ||
        elementProto.oMatchesSelector || elementProto.webkitMatchesSelector || function (query) {
            var el = this, els = (el.document || el.ownerDocument).querySelectorAll(query), i = els.length;

            while (--i >= 0 && els[i] !== el);

            return i > -1;
        };
    }

    win.Pjax = main;

    // CommonJS
    if (typeof module !== "undefined" && module.exports) module.exports = main;

    // RequireJS
    if (typeof define !== "undefined") define(function () { return main; });
})();
