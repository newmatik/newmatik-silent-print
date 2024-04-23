frappe.provide("silent_print.utils");
silent_print.utils.WebSocketPrinter = function (options) {
    var defaults = {
        url: "ws://127.0.0.1:12212/printer",
        onConnect: function () {
        },
        onDisconnect: function () {
        },
        onUpdate: function () {
        },
    };

    var settings = Object.assign({}, defaults, options);
    var websocket;
    var connected = false;
    var reconnectAttempts = 0;

    var onMessage = function (evt) {
        settings.onUpdate(evt.data);
    };

    var onConnect = function () {
        connected = true;
        frappe.whb_status = "Connected";
        settings.onConnect();
    };

    var onDisconnect = function () {
        connected = false;
        frappe.whb_status = "Disconnected";
        settings.onDisconnect();

        if (reconnectAttempts < 4) {
            reconnect();
            reconnectAttempts++;
        }
    };
    
    var onError = function () {
        frappe.whb_status = "Disconnected";
        if (frappe.whb == undefined){
            // frappe.msgprint(__("Could not establish a connection to the printer. Please verify that the <a href='https://github.com/imTigger/webapp-hardware-bridge' target='_blank'>WebApp Hardware Bridge</a> is running."))
            frappe.whb = true
        }
    };

    var connect = function () {
        websocket = new WebSocket(settings.url);
        websocket.onopen = onConnect;
        websocket.onclose = onDisconnect;
        websocket.onmessage = onMessage;
        websocket.onerror = onError;
    };

    var reconnect = function () {
        connect();
    };

    this.submit = function (data) {
        if (Array.isArray(data)) {
            data.forEach(function (element) {
                websocket.send(JSON.stringify(element));
            });
        } else {
            websocket.send(JSON.stringify(data));
        }
    };

    var isConnected = function () {
        console.log("Is Connected:" + connected);
        return connected;
    };

    // load the websocket on reload
    window.onbeforeunload = function() {
        if (reconnectAttempts < 4) {
            reconnect();
            reconnectAttempts++;
        }
    };

    connect();
}