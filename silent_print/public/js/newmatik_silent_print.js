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
        var whb_status = silent_print.utils.whb_status
        var fields = []
        var rack_panel_dt = {}
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
                rack_panel_dt['workorders'].map((val, idx) => {
                    var fieldname = val['abbr'] == "S" ? "order_paper_s" : "order_paper_"
                    fields.push({
                        label: 'Order Paper ' + val['abbr'],
                        fieldname: fieldname,
                        fieldtype: 'Check',
                        default: 1
                    })
                })
            }
        })
        fields.push(
            {
                label: 'Kitting Box Label',
                fieldname: 'kitting_box_label',
                fieldtype: 'Check',
                default: 1
            },
            {
                label: 'Rack Labels',
                fieldname: 'rack_labels',
                fieldtype: 'Check',
                default: 1
            },
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
        )
        // add button
        add_button(function(){
            let d = new frappe.ui.Dialog({
                title: 'Print Work Order',
                    fields: fields,
                    size: 'small', // small, large, extra-large 
                    primary_action_label: 'Print',
                    primary_action(values) {
                        var rack_labels = $("input#d_no_of_rack_labels").val()
                        values['work_orders'] = rack_panel_dt['workorders']
                        var print_formats = []
                        if (values['kitting_box_label'] == 1){
                            print_formats.push({
                                "print_format_name": "Kitting Box Label v2",
                                "name": cur_frm.doc.name,
                                "print_type": "KITTING2",
                            })
                        }
    
                        rack_panel_dt['workorders'].forEach((itm) => {
                            if ((values['order_paper_s'] == 1 && itm['abbr'] == 'S') || (values['order_paper_'] == 1 && itm['abbr'] != 'S')) {
                                print_formats.push({
                                    "print_format_name": "Order Papers",
                                    "name": itm['work_order'],
                                    "print_type": "ORDERPAPERS",
                                });
                            }
                        });
    
                        if (values['rack_labels']){
                            for (var i=1; i <= rack_labels; i++){
                                print_formats.push({
                                    "print_format_name": frm.doc.sales_order? "Rack Label (With Date)" : "Rack Label (No Date)",
                                    "name": cur_frm.doc.name,
                                    "print_type": "RACKLABEL",
                                });
                            }
                        }
                        console.log("print formatss ==>", print_formats)
                        print_formats.map((val, idx) => {
                            send2bridge(frm, val.print_format_name, val.print_type, val.name)
                        })
                        d.hide();
                    }
                });
                d.show();
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
        })
    },
    warehouse_button: function(frm) {
        console.log(frm)
        add_button(function(){
            send2bridge(frm, "Warehouse Label", "WAREHOUSE", frm.doc.name);
        })
    },
    batch_label_button: function(frm) {
        add_button(function(){
            send2bridge(frm, "Batch Label", "BATCH", cur_frm.doc.name);
        })
    },

})

var add_button = function(fn){
    var whb_status = silent_print.utils.whb_status
    const print_icon = __('Print Direct <svg class="icon icon-sm"><use href="#icon-printer"></use></svg>');
    var print_direct = cur_frm.add_custom_button(print_icon, fn).removeClass().addClass(whb_status == 'Connected' ? 'btn btn-primary' : 'btn btn-secondary-dark');
    if (whb_status != 'Connected'){
        print_direct.off('click').on('click', () => {
            frappe.msgprint(__("Could not establish connection to the Webapp Hardware Bridge (WHB). Please verify that it is running before clicking the button again"));
        })
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
            console.log(r)
            printService.submit({
                'type': print_type, //this is the label that identifies the printer in WHB's configuration
                'url': 'file.pdf',
                'file_content': r.message.pdf_base64
            });
        }
    })
}
