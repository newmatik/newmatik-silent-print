frappe.ui.form.on('Delivery Note', {
    refresh: function(frm){
        if(!frm.is_new() && frm.doc.docstatus == 1) {
            silent_print.newmatik.add_custom_button(frm, "Delivery Note")
        }
    },
})