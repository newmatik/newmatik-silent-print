frappe.ui.form.on('Shipment', {
    refresh: function(frm){
        silent_print.newmatik.add_custom_button(frm, "Shipment")
    },
})