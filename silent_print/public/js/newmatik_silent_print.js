frappe.provide("silent_print.newmatik");

// initialize printService
var printService = new silent_print.utils.WebSocketPrinter();

$.extend(silent_print.newmatik, {
    add_custom_button: function(frm, location) {
        // populate button to respective doctype
        if (location == "Work Order"){
            this.work_order_button(frm)
        } else if (location == "Shipment"){
            this.shipment_button(frm)
        } else if (location == "Delivery Note"){
            this.delivery_note_button(frm)
        } else if (location == "Warehouse"){
            this.warehouse_button(frm)
        } else if (location == "Batch"){
            this.batch_label_button(frm)
        }
    },
    work_order_button: function(frm){
        var rack_panel_dt = {}
        var work_orders = []
        frappe.call({
            method: "silent_print.api.work_order.get_rack_labels_count",
            args: {
                work_order: frm.doc.name,
                qty: frm.doc.qty,
                amended_from: frm.doc.amended_from
            },
            async: false,
            callback: function(r) {
                rack_panel_dt = r.message
                work_orders = r.message.workorders
            }
        })

        // KITTING BOX LABEL
        add_button(()=>{send2bridge(frm, "Kitting Box Label v2", "KITTING2", frm.doc.name)}, "Kitting Box Label")

        // RACK LABEL
        add_button(()=>{
            var d = new frappe.ui.Dialog({
                title: 'Print Work Order',
                fields: [
                    {
                        label: '',
                        fieldname: 'rack_labels_html',
                        fieldtype: 'HTML',
                        options: `
                            <section>
                                <p>No of Rack Labels <input type="text" value="${rack_panel_dt['pcb_per_panel']}" id="d_no_of_rack_labels" style='width: 30px; text-align: center'></p>
                                <p>(${frm.doc.qty} PCB / ${rack_panel_dt['pcb_panel']} PCB per panel / ${rack_panel_dt['panels_per_rack']} panels per rack)</p>
                            </section>
                        `
                    }
                ],
                primary_action: function(){
                    var print_type = frm.doc.sales_order? "Rack Label (With Date)" : "Rack Label (No Date)"
                    var no_of_rack_labels = $("input#d_no_of_rack_labels").val()
                    for (var i=1; i <= no_of_rack_labels; i++){
                        silent_print.newmatik.send2bridge(frm, print_type, "RACKLABEL", frm.doc.name);
                    }
                    show_alert(`Printing ${no_of_rack_labels} Rack Label`, 5);
                    d.hide();
                }
            })
            d.show()
        }, "Rack Label")

        // ORDER PAPER
        var print_direct_icon = __('Print Direct <svg class="icon icon-sm"><use href="#icon-printer"></use></svg>');
        frm.add_custom_button("Order Paper", function(){}, print_direct_icon).addClass("order-paper-item")
        var order_paper_items = ""
        work_orders.map((itm, idx)=>{
            order_paper_items += `<li><a class="dropdown-item submenu-list" href="#">${itm.work_order}</a></li>`
        })
        // ORDER PAPER
        var order_paper_items = ""
        work_orders.map((itm, idx)=>{
            order_paper_items += `<li><a class="dropdown-item submenu-list" href="#">${itm.work_order}</a></li>`
        })
        $("a.dropdown-item.order-paper-item").append(`<ul class="dropdown-submenu">${order_paper_items}<ul>`)
        injectCSS(`
            .down-arrow {
                display: inline-block;
                transform: rotate(90deg);
            }
            .dropdown-submenu {
                display: none;
                list-style-type: none;
                padding: 0;
                margin: 0;
            }
            .submenu-list {
                padding: 5px 10px;
            }
            .submenu-list:hover {
                background-color: var(--gray-200);
            }
            .dropdown-item:hover > .dropdown-submenu {
                display: block;
                margin-bottom: 0;
            }
        `)
        $("a.submenu-list").click(function(){
            var wo = $(this).text()
            silent_print.newmatik.send2bridge(frm, "Order Papers", "ORDERPAPERS", wo)
        })
    },
    shipment_button: function(frm) {
        add_button(function(){
            var print_type = "SHIPPING LABEL"
            frappe.call({
                method: "shipment.shipment.doctype.shipment.shipment.print_shipping_label",
                freeze: true,
                freeze_message: __("Printing Shipping Label"),
                args: {
                    shipment_id: frm.doc.shipment_id,
                    service_provider: frm.doc.service_provider
                },
                callback: function(r) {
                    let file = "";
                    let url = "";
                    if (r.message) {
                        if (frm.doc.service_provider == "LetMeShip") {
                            let array = JSON.parse(r.message);
                            array = new Uint8Array(array);
                            file = new Blob([array], {type: "application/pdf"});
                        } else {
                            console.log("Shipping Label: ", r.message);
                            if (Array.isArray(r.message)) {
                                r.message.forEach(
                                    url => window.open(url)
                                );
                            } else {
                                url = r.message;
                                window.open(url);
                            }
                        }

                        // Function to convert blob to base64
                        const blobToBase64 = blob => new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onerror = reject;
                            reader.onload = () => {
                                resolve(reader.result.split(',')[1]);
                            };
                            reader.readAsDataURL(blob);
                        });

                        // Make this function async
                        const fetchFileAsBase64 = (url) => {
                            return fetch(url)
                                .then(response => response.blob())
                                .then(blob => blobToBase64(blob))
                                .catch(error => {
                                    console.error('Error fetching file:', error);
                                    return null;
                                });
                        };
                        

                        if (file !== "") {
                            blobToBase64(file).then(base64 => {
                                printService.submit({
                                    'type': print_type,
                                    'url': 'file.pdf',
                                    'file_content': base64
                                });
                            });
                        } else if (url !== ""){
                            fetchFileAsBase64(url).then(base64 => {
                                printService.submit({
                                    'type': print_type,
                                    'url': 'file.pdf',
                                    'file_content': base64
                                });
                            });
                        }
                    }
                }
            })
        });
    },
    delivery_note_button: function(frm) {
        add_button(function(){
            send2bridge(frm, "Delivery Note De", "DELIVERYNOTE", frm.doc.name, 0, frm.doc.language);
            send2bridge(frm, "Delivery Note De", "DELIVERYNOTE1", frm.doc.name, 0, frm.doc.language);
        })
    },
    warehouse_button: function(frm) {
        add_button(function(){
            send2bridge(frm, "Warehouse Label", "WAREHOUSE", frm.doc.name);
        })
    },
    batch_label_button: function(frm) {
        add_button(function(){
            send2bridge(frm, "Batch Label", "BATCH", cur_frm.doc.name);
        })
    },
    send2bridge: function(frm, print_format, print_type, name, no_letterhead=1, language="en"){
        send2bridge(frm, print_format, print_type, name, no_letterhead=1, language="en")
    },
    add_button: function(fn, print_item_name=null){
        add_button(fn, print_item_name)
    }
})

var add_button = function(fn, print_item_name=null){
    var whb_status = silent_print.utils.whb_status
    const print_icon = __('Print Direct <svg class="icon icon-sm"><use href="#icon-printer"></use></svg>');
    if (whb_status != 'Connected'){
        var print_direct = cur_frm.add_custom_button(print_icon, fn).removeClass().addClass('btn btn-secondary-dark');
        print_direct.off('click').on('click', () => {
            frappe.msgprint(__("Could not establish connection to the Webapp Hardware Bridge (WHB). Please verify that it is running before clicking the button again"));
        })
    }else{
        if (print_item_name!=null){
            var print_direct = cur_frm.add_custom_button(print_item_name, fn, print_icon);
            print_direct.parent().parent().find("button.btn-default").addClass("btn-primary");
        }else{
            var print_direct = cur_frm.add_custom_button(print_item_name, fn, print_icon);
        }
        return print_direct
    }
}

var send2bridge = function (frm, print_format, print_type, name, no_letterhead=1, language="en"){
    // initialize the web socket for the bridge
    var printService = new silent_print.utils.WebSocketPrinter();

    frappe.call({
        method: 'silent_print.utils.print_format.create_pdf',
        args: {
            doctype: frm.doc.doctype,
            name: name,
            silent_print_format: print_format,
            no_letterhead: no_letterhead,
            _lang: language
        },
        callback: (r) => {
            printService.submit({
                'type': print_type, //this is the label that identifies the printer in WHB's configuration
                'url': 'file.pdf',
                'file_content': r.message.pdf_base64
            });
            show_alert('Printing '+ print_format, 5);
        }
    })
}

function injectCSS(cssString) {
    const style = document.createElement('style');
    style.innerHTML = cssString;
    document.head.appendChild(style);
}