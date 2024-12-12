frappe.ui.form.on('Warehouse', {
    refresh: function(frm){
        silent_print.newmatik.add_custom_button(frm, "Warehouse")
    },
})