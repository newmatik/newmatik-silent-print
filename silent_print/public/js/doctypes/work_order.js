frappe.ui.form.on('Work Order', {
    refresh: function(frm){
        silent_print.newmatik.add_custom_button(frm, "Work Order")
    },
})