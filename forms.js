function buildForm(key, targetBox = null, editIndex = null) {
  const schema = SCHEMA[key];
  const box = targetBox || document.getElementById('f-' + key);
  if (!box) return;

  if (key === 'requisition') {
    const existing = editIndex !== null && DB.requisition[editIndex] ? DB.requisition[editIndex] : null;
    box.innerHTML = `
      <div><label>Requisition No</label><input id="in-requisition-reqNo" value="${existing ? (existing.reqNo || '') : ''}"></div>
      <div><label>Requested By</label><input id="in-requisition-requestedBy" value="${existing ? (existing.requestedBy || '') : ''}"></div>
      <div><label>Ward</label><input id="in-requisition-ward" value="${existing ? (existing.ward || '') : ''}"></div>
      <div><label>Date Ordered</label><input id="in-requisition-date" type="date" value="${existing ? (existing.date || '') : ''}"></div>
      <div style="grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <strong>Items</strong>
        <button type="button" class="act" onclick="addRequisitionItemRow()">+ Add Item</button>
      </div>
      <div id="requisition-item-list" style="grid-column:1/-1;display:grid;gap:10px;overflow-x:auto;padding-bottom:8px;min-width:0;align-items:start;"></div>
      <div><label>Attachment</label><input type="file" id="in-requisition-file"></div>
    `;

    if (existing) {
      addRequisitionItemRow(existing);
    } else {
      addRequisitionItemRow();
    }
    return;
  }

  box.innerHTML = schema.fields
    .map((field, index) => {
      if (field === 'file' || field === 'refDoc') {
        return `<div><label>${schema.labels[index]}</label><input type="file" id="in-${key}-${field}"></div>`;
      }
      if (field === 'medicalRecord' || field === 'workExperience') {
        return `<div style="grid-column:1 / -1;"><label>${schema.labels[index]}</label><textarea id="in-${key}-${field}" rows="4" style="width:100%;min-height:90px;resize:vertical;">${(editIndex !== null && DB[key] && DB[key][editIndex] && DB[key][editIndex][field]) || ''}</textarea></div>`;
      }
      return `<div><label>${schema.labels[index]}</label><input id="in-${key}-${field}"></div>`;
    }).join('') + `
      <div style="display:flex;align-items:flex-end;"><button type="button" class="del" onclick="this.parentElement.parentElement.remove()">Remove</button></div>
  `;
}

let requisitionItemCounter = 0;

function addRequisitionItemRow(existing = null) {
  const list = document.getElementById('requisition-item-list');
  if (!list) return;

  const row = document.createElement('div');
  row.className = 'req-item-row';
  row.style.display = 'grid';
  row.style.gridTemplateColumns = 'repeat(6, minmax(110px, 1fr)) 68px';
  row.style.gap = '8px';
  row.style.padding = '10px';
  row.style.border = '1px solid var(--bd)';
  row.style.borderRadius = '8px';
  row.style.background = '#f8fbff';
  row.style.alignItems = 'end';
  row.style.minWidth = '700px';
  row.style.width = 'max-content';
  row.style.maxWidth = '100%';

  const fields = [
    ['itemNo', 'Item No'],
    ['itemName', 'Item Name'],
    ['dosage', 'Dosage'],
    ['method', 'Method'],
    ['cost', 'Cost'],
    ['qty', 'Qty']
  ];

  const item = existing || {};
  row.innerHTML = fields.map(([field, label]) => `
    <div>
      <label style="display:block;font-size:11px;color:#456;">${label}</label>
      <input name="${field}" value="${(item[field] ?? '').toString().replace(/"/g, '&quot;')}" style="width:100%;">
    </div>
  `).join('') + `
    <div style="display:flex;align-items:flex-end;">
      <button type="button" class="del" onclick="this.parentElement.parentElement.remove()">Remove</button>
    </div>
  `;

  list.appendChild(row);
  requisitionItemCounter += 1;
}

Object.keys(SCHEMA).forEach(buildForm);

function openUploadDialog(key, editIndex = null) {
  const titleMap = {
    ward: editIndex !== null ? 'Edit Ward' : 'Upload Ward',
    staff: editIndex !== null ? 'Edit Staff' : 'Upload Staff',
    patient: editIndex !== null ? 'Edit Patient' : 'Upload Patient',
    outpatient: editIndex !== null ? 'Edit Outpatient' : 'Upload Outpatient',
    appointment: editIndex !== null ? 'Edit Appointment' : 'Upload Appointment',
    medication: editIndex !== null ? 'Edit Medication' : 'Upload Medication',
    supply: editIndex !== null ? 'Edit Supply' : 'Upload Supply',
    pharma: editIndex !== null ? 'Edit Drug' : 'Upload Drug',
    requisition: editIndex !== null ? 'Edit Requisition' : 'Upload Requisition',
    supplier: editIndex !== null ? 'Edit Supplier' : 'Upload Supplier',
    leave: editIndex !== null ? 'Edit Leave Request' : 'New Leave Request'
  };

  const overlay = document.getElementById('uploadDialogOverlay');
  const body = document.getElementById('uploadDialogBody');
  if (!overlay || !body) return;

  window.__uploadEditContext = { key, index: editIndex };
  document.getElementById('uploadDialogTitle').textContent = titleMap[key] || 'Upload';
  body.innerHTML = `
    <div id="upload-form-root" class="grid2" style="overflow-x:auto; padding:10px 12px 14px;"></div>
    <div class="btnrow" style="margin-top:12px;display:flex;justify-content:flex-end;gap:8px;">
      <button class="act" onclick="submitUploadDialog('${key}')">Save</button>
      <button class="del" onclick="closeUploadDialog()">Cancel</button>
    </div>
  `;

  buildForm(key, document.getElementById('upload-form-root'), editIndex);
  overlay.classList.add('show');
}

function closeUploadDialog() {
  const overlay = document.getElementById('uploadDialogOverlay');
  if (overlay) overlay.classList.remove('show');
  window.__uploadEditContext = null;
}

function submitUploadDialog(key) {
  const editIndex = window.__uploadEditContext && window.__uploadEditContext.key === key ? window.__uploadEditContext.index : null;
  addRow(key, editIndex);
  closeUploadDialog();
}

