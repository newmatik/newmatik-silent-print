import frappe
import base64

@frappe.whitelist()
def get_rack_labels_count(work_order, qty, amended_from=None):
    import math
    work_orders = [work_order]

    # get work order ST if work order is S
    if work_order.endswith("-S") or "-S-" in work_order:
        wo_get_st = work_order+"T"
        if amended_from:
            length = len(work_order.split("-")[-1])+1
            wo_get_st = work_order[:-length]+"T"

        wo_st_from_s = frappe.db.get_value("Work Order", {"name": ["like", "%"+wo_get_st+"%"], "docstatus": ["!=", "2"]}, order_by="name desc")
        if wo_st_from_s:
            work_orders.append(wo_st_from_s)

    # get work order S if work order is ST
    elif work_order.endswith("-ST") or "-ST-" in work_order:
        wo_get_s = work_order[0:-1]
        if amended_from:
            length = len(work_order.split("-")[-1])+2
            wo_get_s = work_order[:-length]

        wo_s_from_st = frappe.db.sql("SELECT name FROM `tabWork Order` where name like '{0}%' and docstatus != 2 and name != '{1}'".format(wo_get_s, work_order), as_dict=1)
        if wo_s_from_st:
            work_orders.append(wo_s_from_st[0]['name'])

    pcb_panel = 0
    for wo in work_orders:
        item_pcb_item_group = frappe.db.sql("""
            SELECT woitm.item_code 
            FROM `tabWork Order Item` as woitm
            JOIN `tabItem` as itm
            ON woitm.item_code = itm.name
            WHERE woitm.parent = '{}' and itm.item_group like "PCB%"
        """.format(wo), as_dict=1)
        if item_pcb_item_group:
            pcb = frappe.db.get_value("PCB Specification", item_pcb_item_group[0]['item_code'], ['pcb_in_panel_x', 'pcb_in_panel_y'], as_dict=1)
            if pcb:
                pcb_panel = pcb['pcb_in_panel_x'] * pcb['pcb_in_panel_y']
                break

    obj = {
        "qty": qty,
        "pcb_panel": pcb_panel,
        "panels_per_rack": 50,
        "workorders": get_wo_abbr(work_orders)
    }

    pcb_per_panel = 1
    if pcb_panel > 0:
        pcb_per_panel = float(qty) / float(pcb_panel) / float(obj['panels_per_rack'])

    obj.update({"pcb_per_panel": math.ceil(pcb_per_panel)})
    return obj

def get_wo_abbr(work_orders):
    abbrs = {"-SO": "SO", "-ST": "ST", "-TO": "TO", "-M": "M", "-S": "S"}

    wo_abbrs = []
    for wo in list(set(work_orders)):
        abbr = next((abbrs[abbr] for abbr in abbrs if abbr in wo), "TO")
        wo_abbrs.append({"work_order": wo, "abbr": abbr})

    return wo_abbrs

@frappe.whitelist()
def get_orderpapers_pdf(doctype, name, silent_print_format, print_type, doc=None, no_letterhead=0):
    from silent_print.utils.print_format import get_pdf_options, get_pdf
    
    doc = frappe.get_doc(doctype, name)
    html = frappe.get_print(doctype, name, silent_print_format, doc, no_letterhead)
    if not frappe.db.exists("Silent Print Format", silent_print_format):
        return
    silent_print_format = frappe.get_doc("Silent Print Format", silent_print_format)
    options = get_pdf_options(silent_print_format)
    pdf = get_pdf(html, options=options)
    pdf_base64 = base64.b64encode(pdf)
    return {
        "pdf_base64": pdf_base64.decode(),
        "print_type": print_type
    }


