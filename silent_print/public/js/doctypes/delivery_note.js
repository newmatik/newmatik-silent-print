frappe.ui.form.on('Delivery Note', {
    refresh: function(frm){
        silent_print.newmatik.add_custom_button(frm, "Delivery Note")
    },
})