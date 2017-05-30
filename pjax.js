(function (w, d) {
    "use strict";

    if (!w.history.pushState) {
        return;
    }

    var pjax, container, tmp,
        host = w.location.protocol.replace(/:/g, "") + "://" + w.location.hostname,
        state = {};

    function load(url) {
        if (pjax) {
            pjax.abort();
        }

        $(document).trigger("pjax.initiate", [url]);

        pjax = $.ajax(url, {
            headers: { "X-PJAX": "true" }
        }).done(function (data) {
            $(document).trigger("pjax.done", [url]);

            tmp = $("<div><\/div>").html(data);

            var title = $("title", tmp).text() || "";

            w.history.pushState(state, title, url.substring(host.length));

            container.html( $(".pjax-container", tmp).html() );

            tmp = null;
        }).fail(function (jqXHR, status, error) {
            $(document).trigger("pjax.fail", [url, status, error]);
        });
    }

    $(document).on("click submit", "a:not([data-ignore-pjax]):not([href^='#']):not([href^='javascript:'])", function (e) {
        container = container || $(".pjax-container");

        if (!container.length) {
            container = null;
            return;
        }

        var url = this.href;

        if (url.indexOf(host) !== 0) {
            return;
        }

        e.preventDefault();

        if (url === String(window.location)) {
            return;
        }

        load(url);
    });
})(window, document);
