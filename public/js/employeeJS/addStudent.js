// Clean Add Student JavaScript - Professional Design

const addStudentForm = document.getElementById('addStudentForm');
const groupCards = document.querySelectorAll('.group-card');
const groupsInput = document.getElementById('groups');
const studentsTableBody = document.getElementById('studentsTableBody');
const searchStudentsInput = document.getElementById('searchStudents');
const filterByGroupSelect = document.getElementById('filterByGroup');

// Show loading overlay
function showLoading() {
  const spinner = document.getElementById('loadingOverlay');
  if (spinner) spinner.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
  const spinner = document.getElementById('loadingOverlay');
  if (spinner) spinner.style.display = 'none';
}

// Show toast message
function showToast(message, isError = false) {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  
  const toast = document.createElement('div');
  toast.classList.add('toast');
  if (isError) {
    toast.classList.add('error');
  }
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Group selection functionality
let selectedGroups = [];

// Multiple group selection (toggle on/off)
groupCards.forEach(card => {
  card.addEventListener('click', function() {
    const groupId = this.dataset.groupId;
    const groupName = this.querySelector('h6').textContent;
    
    if (this.classList.contains('selected')) {
      // Remove from selection
      this.classList.remove('selected');
      selectedGroups = selectedGroups.filter(id => id !== groupId);
      showToast(`تم إلغاء اختيار المجموعة: ${groupName}`);
    } else {
      // Add to selection
      this.classList.add('selected');
      selectedGroups.push(groupId);
      showToast(`تم اختيار المجموعة: ${groupName}`);
    }
    
    // Update selected groups array
    updateSelectedGroups();
  });
});

// Function to update the groups input field
function updateSelectedGroups() {
  groupsInput.value = JSON.stringify(selectedGroups);
}

// Form submission
addStudentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Validate group selection
  if (selectedGroups.length === 0) {
    showToast('يرجى اختيار مجموعة واحدة على الأقل للطالب', true);
    return;
  }

  // Basic client-side validation
  const nameVal = (document.getElementById('studentName')?.value || '').trim();
  const phoneVal = (document.getElementById('studentPhoneNumber')?.value || '').trim();
  const parentPhoneVal = (document.getElementById('studentParentPhone')?.value || '').trim();

  if (nameVal.length < 3) {
    await Swal.fire({ icon: 'error', title: 'خطأ في البيانات', text: 'اسم الطالب لازم يكون اكتر من 3 احرف' });
    return;
  }
  if (!/^\d{11}$/.test(phoneVal)) {
    await Swal.fire({ icon: 'error', title: 'خطأ في البيانات', text: 'رقم الهاتف يجب ان يكون مكون من 11 رقم' });
    return;
  }
  if (!/^\d{11}$/.test(parentPhoneVal)) {
    await Swal.fire({ icon: 'error', title: 'خطأ في البيانات', text: 'رقم هاتف ولى الامر يجب ان يكون مكون من 11 رقم' });
    return;
  }

  showLoading();
  
  const formData = new FormData(addStudentForm);
  const data = Object.fromEntries(formData);
  
  // Parse groups if it's a JSON string
  if (data.groups && typeof data.groups === 'string') {
    try {
      data.groups = JSON.parse(data.groups);
    } catch (e) {
      console.error('Error parsing groups:', e);
      data.groups = [];
    }
  }
  
  // Debug: Log the data being sent
  console.log('Sending data:', data);

  try {
    const response = await fetch('/employee/add-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Robust parsing for success/error
    let responseData = null;
    const rawText = await response.text();
    try { responseData = rawText ? JSON.parse(rawText) : null; } catch { responseData = { message: rawText }; }

    if (response.ok) {
      showToast('تم إضافة الطالب بنجاح!');
      
      // Show student code in popup modal
      if (responseData && responseData.studentCode) {
        setTimeout(() => {
          Swal.fire({
            icon: 'success',
            title: 'تم إضافة الطالب بنجاح!',
            html: `
              <div class="text-center">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <h3 style="color: #000; margin-bottom: 10px;">كود الطالب للجهاز</h3>
                  <div style="font-size: 48px; font-weight: bold; color: #007bff; letter-spacing: 5px; margin: 20px 0;">
                    ${responseData.studentCode}
                  </div>
                  <p style="color: #666; margin: 0;">استخدم هذا الكود لإضافة الطالب للجهاز</p>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                  <p><strong>اسم الطالب:</strong> ${responseData.studentName}</p>
                  <p><strong>المجموعة:</strong> ${responseData.groupName}</p>
                  ${responseData.deviceStatus && responseData.deviceStatus.success
                    ? `<p class="text-success"><strong>✅ تم إضافة الطالب للجهاز بنجاح</strong></p>
                        ${responseData.deviceStatus.data && responseData.deviceStatus.data.deviceInfo
                          ? `<p><strong>الجهاز:</strong> ${responseData.deviceStatus.data.deviceInfo.deviceName} (${responseData.deviceStatus.data.deviceInfo.deviceIp})</p>`
                          : ''
                        }`
                    : `<p class="text-warning"><strong>⚠️ لم يتم إضافة الطالب للجهاز</strong></p>
                        <small class="text-muted">${(responseData.deviceStatus && responseData.deviceStatus.error) ? responseData.deviceStatus.error : 'تحقق من تشغيل خدمة البصمة'}</small>`
                  }
                </div>
              </div>
            `,
            confirmButtonText: 'حسناً',
            confirmButtonColor: '#007bff',
            width: '500px'
          });
        }, 500);
      }
      
      // Reset form
      addStudentForm.reset();
      groupCards.forEach(c => c.classList.remove('selected'));
      groupsInput.value = '';
      selectedGroups = [];
      
      // Reload students table
      loadStudents();
      
    } else {
      const errMsg = (responseData && (responseData.message || responseData.error)) || 'حدث خطأ في إضافة الطالب';
      await Swal.fire({ icon: 'error', title: 'فشل إضافة الطالب', text: errMsg });
      showToast(errMsg, true);
    }
  } catch (error) {
    console.error('Error adding student:', error);
    await Swal.fire({ icon: 'error', title: 'خطأ في الاتصال', text: 'حدث خطأ في الاتصال. حاول مرة أخري.' });
    showToast('حدث خطأ في الاتصال', true);
  } finally {
    hideLoading();
  }
});

// Load all students
async function loadStudents() {
  try {
    const response = await fetch('/employee/all-students');
    const data = await response.json();
    
    if (response.ok) {
      displayStudents(data);
    } else {
      console.error('Failed to load students:', data.message);
    }
  } catch (error) {
    console.error('Error loading students:', error);
  }
}

// Display students in table
function displayStudents(students) {
  if (!studentsTableBody) return;
  
  studentsTableBody.innerHTML = '';
  
  if (students.length === 0) {
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center text-muted">لا يوجد طلاب مسجلين</td>
      </tr>
    `;
    return;
  }
  
  students.forEach(student => {
    const row = document.createElement('tr');
    row.dataset.groupId = (student.group && student.group._id) ? student.group._id : '';
    
    // Format last payment date
    const lastPaymentDate = student.lastPaymentDate 
      ? new Date(student.lastPaymentDate).toLocaleDateString('ar-EG')
      : '—';
    
    row.innerHTML = `
      <td class="text-center">${student.studentName}</td>
      <td class="text-center">${student.studentCode}</td>
      <td class="text-center">${student.studentPhoneNumber}</td>
      <td class="text-center">${student.studentParentPhone}</td>
      <td class="text-center">
        <div>
          ${student.groups && student.groups.length > 0 ? 
            student.groups.map(g => g.groupName || g).join(', ') : 
            'غير محدد'
          }
        </div>
      </td>

      <td class="text-center">
        <span class="monthly-payment-status ${student.monthlyPaymentPaid ? 'payment-paid' : 'payment-unpaid'}">
          ${student.monthlyPaymentPaid ? 'مدفوع' : 'غير مدفوع'}
        </span>
        ${!student.monthlyPaymentPaid ? `<button class="btn btn-sm btn-success ms-1" onclick="payMonthlyFee('${student._id}')">دفع</button>` : ''}
      </td>
      <td class="text-center">${lastPaymentDate}</td>
      <td class="text-center">${new Date(student.createdAt).toLocaleDateString('ar-EG')}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary" onclick="editStudent('${student._id}')">
          <i class="material-symbols-rounded" style="font-size: 16px;">edit</i>
        </button>
        <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteStudent('${student._id}')">
          <i class="material-symbols-rounded" style="font-size: 16px;">delete</i>
        </button>
      </td>
    `;
    studentsTableBody.appendChild(row);
  });
}

// Filter students
function filterStudents() {
  const searchTerm = searchStudentsInput.value.toLowerCase();
  const selectedGroup = filterByGroupSelect.value;
  
  const rows = studentsTableBody.querySelectorAll('tr');
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return; // Skip empty rows
    
    const studentName = cells[0].textContent.toLowerCase();
    const studentCode = cells[1].textContent.toLowerCase();
    const phoneNumber = cells[2].textContent.toLowerCase();
    const parentPhone = cells[3].textContent.toLowerCase();
    const groupName = cells[4].textContent.toLowerCase();
    
    const matchesSearch = !searchTerm || 
      studentName.includes(searchTerm) || 
      studentCode.includes(searchTerm) || 
      phoneNumber.includes(searchTerm) || 
      parentPhone.includes(searchTerm);
    
    const matchesGroup = !selectedGroup || row.dataset.groupId === selectedGroup;
    
    if (matchesSearch && matchesGroup) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// Edit student function - Open modal directly
function editStudent(studentId) {
  openEditModal(studentId);
}

// Open edit modal with form
function openEditModal(studentId) {
  // Fetch student data and show edit form
  fetch(`/employee/get-student/${studentId}`)
    .then(response => response.json())
    .then(data => {
      const student = data.student || data;
      if (student && student._id) {
        Swal.fire({
          title: 'تعديل بيانات الطالب',
          html: `
            <form id="editStudentForm" style="text-align: right;">
              <div class="mb-3">
                <label class="form-label fw-bold">اسم الطالب</label>
                <input type="text" class="form-control" id="editStudentName" value="${student.studentName}" required style="border: 1px solid #ddd; border-radius: 4px; padding: 8px;">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">رقم هاتف الطالب</label>
                <input type="text" class="form-control" id="editStudentPhone" value="${student.studentPhoneNumber}" required style="border: 1px solid #ddd; border-radius: 4px; padding: 8px;">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">رقم هاتف ولي الأمر</label>
                <input type="text" class="form-control" id="editParentPhone" value="${student.studentParentPhone}" required style="border: 1px solid #ddd; border-radius: 4px; padding: 8px;">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">اسم المدرسة</label>
                <input type="text" class="form-control" id="editSchoolName" value="${student.schoolName || ''}" style="border: 1px solid #ddd; border-radius: 4px; padding: 8px;">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold">المجموعات</label>
                <select id="editGroups" class="form-select" multiple required>
                  <option value="">اختر المجموعات</option>
                </select>
                <small class="form-text text-muted">اضغط Ctrl (أو Cmd على Mac) لاختيار عدة مجموعات. يجب اختيار مجموعة واحدة على الأقل.</small>
              </div>
            </form>
          `,
          showCancelButton: true,
          confirmButtonText: 'حفظ التعديلات',
          cancelButtonText: 'إلغاء',
          confirmButtonColor: '#000',
          cancelButtonColor: '#6c757d',
          width: '500px',
          preConfirm: () => {
            const formData = {
              studentName: document.getElementById('editStudentName').value,
              studentPhoneNumber: document.getElementById('editStudentPhone').value,
              studentParentPhone: document.getElementById('editParentPhone').value,
              schoolName: document.getElementById('editSchoolName').value,
              groups: Array.from(document.getElementById('editGroups').selectedOptions)
                .map(o => o.value)
                .filter(value => value !== '') // Remove empty values
            };
            return updateStudent(studentId, formData);
          }
        });

        // Populate group selects
        fetch('/employee/groups')
          .then(r => r.json())
          .then(groups => {
            const multiSelect = document.getElementById('editGroups');
            
            // Clear existing options
            multiSelect.innerHTML = '<option value="">اختر المجموعات</option>';
            
            groups.forEach(g => {
              const option = document.createElement('option');
              option.value = g._id;
              option.textContent = g.groupName;
              if ((student.groups || []).some(sg => (sg._id || sg) === g._id)) {
                option.selected = true;
              }
              multiSelect.appendChild(option);
            });
          });
      }
    })
    .catch(error => {
      console.error('Error fetching student:', error);
      showToast('حدث خطأ في جلب بيانات الطالب', true);
    });
}

// Update student function
async function updateStudent(studentId, formData) {
  try {
    const response = await fetch(`/employee/update-student/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('تم تحديث بيانات الطالب بنجاح');
      loadStudents(); // Reload the table
      return true;
    } else {
      showToast(data.message || 'حدث خطأ في تحديث الطالب', true);
      return false;
    }
  } catch (error) {
    console.error('Error updating student:', error);
    showToast('حدث خطأ في الاتصال', true);
    return false;
  }
}

// Delete student function
async function deleteStudent(studentId) {
  const result = await Swal.fire({
    title: 'تأكيد الحذف',
    text: 'هل أنت متأكد من حذف هذا الطالب؟',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء'
  });

  if (result.isConfirmed) {
    try {
      const response = await fetch(`/employee/delete-student/${studentId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showToast('تم حذف الطالب بنجاح');
        loadStudents(); // Reload the table
      } else {
        const data = await response.json();
        showToast(data.message || 'حدث خطأ في حذف الطالب', true);
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      showToast('حدث خطأ في الاتصال', true);
    }
  }
}

// Pay monthly fee function
async function payMonthlyFee(studentId) {
  const result = await Swal.fire({
    title: 'تأكيد الدفع',
    text: 'هل تريد تسجيل دفع الرسوم الشهرية لهذا الطالب؟',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'نعم، سجل الدفع',
    cancelButtonText: 'إلغاء'
  });

  if (result.isConfirmed) {
    try {
      const response = await fetch(`/employee/pay-monthly-fee/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showToast(data.message);
        loadStudents(); // Reload the table
      } else {
        showToast(data.message || 'حدث خطأ في تسجيل الدفع', true);
      }
    } catch (error) {
      console.error('Error paying monthly fee:', error);
      showToast('حدث خطأ في الاتصال', true);
    }
  }
}

// Initialize form
document.addEventListener('DOMContentLoaded', function() {
  // Load students table
  loadStudents();
  
  // Add search and filter event listeners
  if (searchStudentsInput) {
    searchStudentsInput.addEventListener('input', filterStudents);
  }
  
  if (filterByGroupSelect) {
    filterByGroupSelect.addEventListener('change', filterStudents);
  }
  
  // Add form validation
  addStudentForm.addEventListener('input', function() {
    // Real-time validation can be added here
  });
});

console.log('Add Student JavaScript loaded - Professional design');