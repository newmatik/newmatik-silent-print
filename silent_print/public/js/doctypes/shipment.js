frappe.ui.form.on('Shipment', {
    refresh: function(frm){
        if(["Booked", "Submitted"].includes(frm.doc.status)){
            if (!frm.doc.service_provider || !frm.doc.shipment_id) {
                const missingField = !frm.doc.service_provider ? "Service Provider" : "Shipment ID";
                frappe.throw(__(`Can't proceed due to the ${missingField} missing field.`));
            } else {
                silent_print.newmatik.add_custom_button(frm, "Shipment");
            }
        }
    },
})