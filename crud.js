async function addRow(key, editIndex = null) {
  if (key === 'requisition') {
    const reqNoEl = document.getElementById('in-requisition-reqNo');
    const requestedByEl = document.getElementById('in-requisition-requestedBy');
    const wardEl = document.getElementById('in-requisition-ward');
    const dateEl = document.getElementById('in-requisition-date');
    const fileEl = document.getElementById('in-requisition-file');
    const itemRows = [...document.querySelectorAll('#requisition-item-list .req-item-row')];

    const items = itemRows.map(row => {
      const vals = {};
      ['itemNo', 'itemName', 'dosage', 'method', 'cost', 'qty'].forEach(field => {
        const input = row.querySelector(`input[name="${field}"]`);
        vals[field] = input ? input.value.trim() : '';
      });
      return vals;
    }).filter(item => item.itemNo || item.itemName || item.dosage || item.method || item.cost || item.qty);

    if (!items.length) {
      alert('Add at least one requisition item before saving.');
      return;
    }

    const finish = async () => {
      const base = {
        reqNo: reqNoEl ? reqNoEl.value.trim() : '',
        requestedBy: requestedByEl ? requestedByEl.value.trim() : '',
        ward: wardEl ? wardEl.value.trim() : '',
        date: dateEl ? dateEl.value : '',
        status: 'Pending',
        taxRate: 20
      };

      const existing = editIndex !== null && DB.requisition[editIndex] ? DB.requisition[editIndex] : {};

      try {
        for (const item of items) {
          const qty = Number(item.qty || 0);
          const cost = Number(item.cost || 0);
          const subtotal = qty * cost;
          const tax = calculateTax(subtotal, base.taxRate);
          const total = subtotal + tax;

          const record = stampRecord({
            ...existing,
            ...base,
            itemNo: item.itemNo,
            itemName: item.itemName,
            dosage: item.dosage,
            method: item.method,
            cost, qty, subtotal, tax, total,
            status: existing.status || base.status
          });
          if (!record.reqNo) record.reqNo = 'REQ' + Math.floor(1000 + Math.random() * 9000);

          if (editIndex !== null && existing.id) {
            const saved = await apiPut('requisition', existing.id, record);
            DB.requisition[editIndex] = { ...record, ...saved, id: existing.id };
          } else {
            const saved = await apiPost('requisition', record);
            DB.requisition.push(saved);
          }
        }
        showToast((editIndex !== null ? 'Requisition updated.' : 'Requisition saved.'));
      } catch (e) {
        showToast('Could not save requisition: ' + e.message, 'error');
      }

      render('requisition');
      requisitionItemCounter = 0;
      buildForm('requisition');
    };

    if (fileEl && fileEl.files && fileEl.files[0]) {
      const file = fileEl.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const baseFile = { file: reader.result, fileName: file.name };
        items.forEach(item => Object.assign(item, baseFile));
        finish();
      };
      reader.readAsDataURL(file);
      return;
    }

    finish();
    return;
  }

  const schema = SCHEMA[key];
  const obj = {};
  const fileFields = schema.fields.filter(field => field === 'file' || field === 'refDoc');
  const fileEls = fileFields.map(field => ({ field, el: document.getElementById('in-' + key + '-' + field) }));

  const finish = async () => {
    const current = editIndex !== null && DB[key] && DB[key][editIndex] ? DB[key][editIndex] : {};

    schema.fields.forEach(field => {
      if (field === 'file' || field === 'refDoc') return;
      const el = document.getElementById('in-' + key + '-' + field);
      if (!el) return;
      obj[field] = el.value;
      el.value = '';
    });

    const idField = schema.fields[0];
    if (!obj[idField]) {
      obj[idField] = current[idField] || key.toUpperCase().slice(0, 3) + Math.floor(1000 + Math.random() * 8999);
    }

    if (key === 'pharma' && obj.file) {
      obj.photo = obj.file;
    }

    if (key === 'appointment') {
      const fee = Number(obj.fee || current.fee || 0);
      const taxRate = Number(obj.taxRate || current.taxRate || 20);
      obj.tax = calculateTax(fee, taxRate);
      obj.total = fee + obj.tax;
      obj.paymentStatus = obj.paymentStatus || current.paymentStatus || 'Pending';
    }

    if (key === 'supply') {
      const cost = Number(obj.cost || current.cost || 0);
      const qty = Number(obj.qty || current.qty || 0);
      const subtotal = cost * qty;
      const taxRate = Number(obj.taxRate || current.taxRate || 20);
      obj.subtotal = subtotal;
      obj.tax = calculateTax(subtotal, taxRate);
      obj.total = subtotal + obj.tax;
      obj.paymentStatus = obj.paymentStatus || current.paymentStatus || 'Pending';
    }

    const finalRecord = stampRecord({ ...current, ...obj });

    try {
      if (editIndex !== null && current.id) {
        const saved = await apiPut(key, current.id, finalRecord);
        DB[key][editIndex] = { ...finalRecord, ...saved, id: current.id };
      } else {
        const saved = await apiPost(key, finalRecord);
        DB[key].push(saved);
      }
      showToast(editIndex !== null ? 'Record updated.' : 'Record added.');
    } catch (e) {
      showToast('Could not save: ' + e.message, 'error');
    }

    render(key);
    if (key === 'ward' || key === 'staff' || key === 'patient') { renderDash(); renderBeds(); }
  };

  const processFile = index => {
    if (index >= fileEls.length) {
      finish();
      return;
    }

    const { field, el } = fileEls[index];
    if (!el) {
      obj[field] = '';
      obj[field + 'Name'] = '';
      processFile(index + 1);
      return;
    }

    if (el.files && el.files[0]) {
      const file = el.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        obj[field] = reader.result;
        obj[field + 'Name'] = file.name;
        if (key === 'pharma' && field === 'file') obj.photo = reader.result;
        el.value = '';
        processFile(index + 1);
      };

      reader.readAsDataURL(file);
    } else {
      obj[field] = '';
      obj[field + 'Name'] = '';
      el.value = '';
      processFile(index + 1);
    }
  };

  processFile(0);
}

async function delRow(key, index) {
  const row = DB[key][index];
  if (!row) return;

  const label = (row.first ? `${row.first} ${row.last || ''}`.trim() : (row.name || row.itemName || row.staffName || row.patientName || 'this record'));
  if (!confirm(`Delete ${label}? This cannot be undone.`)) return;

  try {
    if (row.id) await apiDelete(key, row.id);
    DB[key].splice(index, 1);
    render(key);
    if (key === 'ward' || key === 'staff' || key === 'patient') { renderDash(); renderBeds(); }
    showToast('Deleted.');
  } catch (e) {
    showToast('Could not delete: ' + e.message, 'error');
  }
}

function setSelectOptions(selectId, values, placeholder = 'Select an option') {
  const select = document.getElementById(selectId);
  if (!select) return;

  const opts = Array.from(new Set(values.filter(Boolean))).sort();
  select.innerHTML = `<option value="">${placeholder}</option>` + opts.map(value => `<option value="${value}">${value}</option>`).join('');
}

function buildSearchSuggestions() {
  const staffQuals = Array.from(new Set((DB.staff || []).map(s => s.qual).filter(Boolean))).sort();
  const patientAllergies = Array.from(new Set((DB.patient || []).map(p => p.allergies).filter(Boolean))).sort();
  const patientMedications = Array.from(new Set((DB.medication || []).map(m => m.drugName).filter(Boolean))).sort();
  const patientIllnesses = Array.from(new Set((DB.patient || [])
    .map(p => p.medicalRecord)
    .filter(Boolean)
    .map(text => text.split(/[.;]/)[0].trim())
    .filter(Boolean))).sort();

  setSelectOptions('staff-qualification-select', staffQuals, 'All qualifications');
  setSelectOptions('patient-allergy-select', patientAllergies, 'All allergies');
  setSelectOptions('patient-medication-select', patientMedications, 'All medications');
  setSelectOptions('patient-illness-select', patientIllnesses, 'All illness records');

  const staffList = document.getElementById('staff-search-suggestions');
  if (staffList) {
    staffList.innerHTML = staffQuals.map(value => `<option value="${value}"></option>`).join('');
  }

  const patientList = document.getElementById('patient-search-suggestions');
  if (patientList) {
    patientList.innerHTML = [...patientAllergies, ...patientMedications, ...patientIllnesses].map(value => `<option value="${value}"></option>`).join('');
  }
}

function getSearchFieldValue(row, field) {
  if (!row) return '';

  const medicationValues = (DB.medication || [])
    .filter(m => m.patNo === row.patNo)
    .map(m => m.drugName)
    .join(' ');

  const map = {
    all: () => Object.values(row).join(' '),
    name: () => [row.first, row.last, row.name, row.itemName, row.patientName, row.staffName].filter(Boolean).join(' '),
    staffNo: () => row.staffNo || '',
    position: () => row.position || '',
    qual: () => row.qual || '',
    qualification: () => row.qual || '',
    ward: () => `${row.ward || ''} ${row.wardNo || ''}`,
    patNo: () => row.patNo || '',
    status: () => row.status || '',
    localDoctor: () => row.localDoctor || '',
    allergies: () => row.allergies || '',
    medication: () => medicationValues || '',
    illness: () => row.medicalRecord || '',
    medicalRecord: () => row.medicalRecord || '',
    number: () => row.number || '',
    location: () => row.location || '',
    beds: () => row.beds || '',
    apptDate: () => row.apptDate || row.date || '',
    apptTime: () => row.apptTime || row.time || '',
    reqNo: () => row.reqNo || '',
    itemName: () => row.itemName || '',
    itemNo: () => row.itemNo || '',
    requestedBy: () => row.requestedBy || '',
    supNo: () => row.supNo || ''
  };

  const fn = map[field] || map.all;
  return String(fn()).toLowerCase();
}
