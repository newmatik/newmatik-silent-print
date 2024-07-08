// Copyright (c) 2022, Roque Vera and contributors
// For license information, please see license.txt

frappe.ui.form.on('Silent Print Format', {
	// refresh: function(frm) {

	// }
	page_size: function(frm) {
		if (frm.doc.page_size == 'A4') {
			frm.set_value("use_default_margin", 1)
		}
	}
});
