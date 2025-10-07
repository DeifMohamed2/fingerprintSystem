// Clean Add Student JavaScript - Professional Design

const addStudentForm = document.getElementById('addStudentForm');
const groupCards = document.querySelectorAll('.group-card');
const groupsInput = document.getElementById('groups');
const studentsTableBody = document.getElementById('studentsTableBody');
const searchStudentsInput = document.getElementById('searchStudents');
const filterByGroupSelect = document.getElementById('filterByGroup');

// Debug: Check if form element exists
console.log('addStudentForm element:', addStudentForm);
console.log('groupCards found:', groupCards.length);
console.log('groupsInput element:', groupsInput);

// Device status refresh functionality
async function refreshDeviceStatus() {
  try {
    const response = await fetch('/employee/device-status');
    const data = await response.json();
    
    if (data.success) {
      // Reload the page to show updated device status
      window.location.reload();
    } else {
      showToast('فشل في تحديث حالة الأجهزة', true);
    }
  } catch (error) {
    console.error('Error refreshing device status:', error);
    showToast('خطأ في تحديث حالة الأجهزة', true);
  }
}

// Auto-refresh device status every 30 seconds
setInterval(refreshDeviceStatus, 30000);

// Manual refresh function for group selection (can be called from console or button)
window.refreshGroupSelection = function() {
  console.log('Manually refreshing group selection...');
  setupGroupSelection();
};

// Auto-refresh group selection every 10 seconds to handle dynamic content
setInterval(() => {
  const groupCards = document.querySelectorAll('.group-card');
  if (groupCards.length > 0) {
    // Check if any cards don't have event listeners
    let needsRefresh = false;
    groupCards.forEach(card => {
      if (!card.dataset.listenerAdded) {
        needsRefresh = true;
      }
    });
    
    if (needsRefresh) {
      console.log('Refreshing group selection due to new cards...');
      setupGroupSelection();
    }
  }
}, 10000);

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

// Function to setup group selection
function setupGroupSelection() {
  console.log('Setting up group selection...');
  
  // Re-query group cards
  const groupCards = document.querySelectorAll('.group-card');
  console.log('Found group cards:', groupCards.length);
  
  if (groupCards.length === 0) {
    console.error('No group cards found!');
    return;
  }
  
  // Multiple group selection (toggle on/off)
  groupCards.forEach((card, index) => {
    console.log(`Setting up group card ${index}:`, card);
    
    // Remove any existing event listeners
    card.replaceWith(card.cloneNode(true));
    const newCard = document.querySelectorAll('.group-card')[index];
    
    newCard.addEventListener('click', function() {
      const groupId = this.dataset.groupId;
      const groupName = this.querySelector('h6')?.textContent || 'Unknown Group';
      
      console.log(`Group card clicked: ${groupName} (${groupId})`);
      
      if (this.classList.contains('selected')) {
        // Remove from selection
        this.classList.remove('selected');
        selectedGroups = selectedGroups.filter(id => id !== groupId);
        console.log(`Removed group ${groupName} (${groupId}) from selection. Current groups:`, selectedGroups);
        showToast(`تم إلغاء اختيار المجموعة: ${groupName}`);
      } else {
        // Add to selection
        this.classList.add('selected');
        selectedGroups.push(groupId);
        console.log(`Added group ${groupName} (${groupId}) to selection. Current groups:`, selectedGroups);
        showToast(`تم اختيار المجموعة: ${groupName}`);
      }
      
      // Update selected groups array
      updateSelectedGroups();
    });
    
    // Mark this card as having a listener
    newCard.dataset.listenerAdded = 'true';
  });
}

// Setup group selection when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupGroupSelection);
} else {
  setupGroupSelection();
}

// Function to update the groups input field
function updateSelectedGroups() {
  groupsInput.value = JSON.stringify(selectedGroups);
}

// Form submission
if (addStudentForm) {
  console.log('Adding event listener to form');
  addStudentForm.addEventListener('submit', async (e) => {
    console.log('Form submitted!');
    e.preventDefault();
    
  // Validate group selection
  if (selectedGroups.length === 0) {
    console.log('No groups selected');
    await Swal.fire({ 
      icon: 'error', 
      title: 'خطأ في البيانات', 
      text: 'يرجى اختيار مجموعة واحدة على الأقل للطالب' 
    });
    return;
  }
  
  console.log('Selected groups:', selectedGroups);

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
                  <p><strong>المجموعة:</strong> ${responseData.groups && responseData.groups.length > 0 ? responseData.groups.map(g => g.groupName || g).join(', ') : 'غير محدد'}</p>
                  ${responseData.deviceStatus && responseData.deviceStatus.success
                    ? `<p class="text-success"><strong>تم إضافة الطالب للجهاز بنجاح</strong></p>
                        ${responseData.deviceStatus.data && responseData.deviceStatus.data.deviceInfo
                          ? `<p><strong>الجهاز:</strong> ${responseData.deviceStatus.data.deviceInfo.deviceName} (${responseData.deviceStatus.data.deviceInfo.deviceIp})</p>`
                          : ''
                        }`
                    : `<p class="text-warning"><strong>لم يتم إضافة الطالب للجهاز</strong></p>
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
      // Enhanced error handling for server responses
      let errMsg = 'حدث خطأ في إضافة الطالب';
      let errorDetails = '';
      
      if (responseData) {
        if (responseData.message) {
          errMsg = responseData.message;
        } else if (responseData.error) {
          errMsg = responseData.error;
        }
        
        // Add additional error details if available
        if (responseData.deviceStatus && !responseData.deviceStatus.success) {
          errorDetails = `<br><br><strong>تفاصيل خطأ الجهاز:</strong><br>${responseData.deviceStatus.error || 'غير محدد'}`;
        }
      }
      
      console.error('Server error:', responseData);
      await Swal.fire({ 
        icon: 'error', 
        title: 'فشل إضافة الطالب', 
        html: `<div dir="rtl">${errMsg}${errorDetails}</div>`
      });
      showToast(errMsg, true);
    }
  } catch (error) {
    console.error('Error adding student:', error);
    
    let errorMessage = 'حدث خطأ في الاتصال. حاول مرة أخري.';
    let errorDetails = '';
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'فشل في الاتصال بالخادم';
      errorDetails = '<br><br>تأكد من أن الخادم يعمل بشكل صحيح.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    await Swal.fire({ 
      icon: 'error', 
      title: 'خطأ في الاتصال', 
      html: `<div dir="rtl">${errorMessage}${errorDetails}</div>`
    });
    showToast(errorMessage, true);
  } finally {
    hideLoading();
  }
  });
} else {
  console.error('addStudentForm element not found!');
}

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
    text: 'هل أنت متأكد من حذف هذا الطالب؟ سيتم حذفه أيضاً من جميع أجهزة البصمة.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء'
  });

  if (result.isConfirmed) {
    try {
      // First, get student data to find the student code
      const studentResponse = await fetch(`/employee/get-student/${studentId}`);
      const studentData = await studentResponse.json();
      const student = studentData.student || studentData;
      const studentCode = student.studentCode;

      // Delete student from database
      const response = await fetch(`/employee/delete-student/${studentId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // If student has a code, try to delete from devices
        if (studentCode) {
          try {
            await deleteUserFromAllDevices(studentCode);
          } catch (deviceError) {
            console.warn('Error deleting from devices:', deviceError);
            // Don't fail the whole operation if device deletion fails
          }
        }
        
        showToast('تم حذف الطالب بنجاح من قاعدة البيانات والأجهزة');
        loadStudents(); // Reload the table
        loadDeviceUsers(); // Reload device users table
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

// Delete user from all devices by student code
async function deleteUserFromAllDevices(studentCode) {
  try {
    const response = await fetch(`/employee/device-users/${studentCode}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Successfully deleted user ${studentCode} from devices`);
    } else {
      console.warn(`Failed to delete user ${studentCode} from devices:`, data.message);
    }
  } catch (error) {
    console.error('Error deleting user from devices:', error);
    throw error;
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

// Device Users Management Functions
let deviceUsersData = [];

// Load device users from all devices
async function loadDeviceUsers() {
  const loadingElement = document.getElementById('deviceUsersLoading');
  const emptyElement = document.getElementById('deviceUsersEmpty');
  const tableBody = document.getElementById('deviceUsersTableBody');
  const table = document.getElementById('deviceUsersTable');
  
  try {
    // Show loading
    loadingElement.style.display = 'block';
    emptyElement.style.display = 'none';
    table.style.display = 'none';
    
    const response = await fetch('/employee/all-device-users');
    const data = await response.json();
    
    if (data.success) {
      deviceUsersData = data.data || [];
      renderDeviceUsers(deviceUsersData);
    } else {
      showToast(data.message || 'فشل في تحميل مستخدمي الأجهزة', true);
      showEmptyDeviceUsers();
    }
  } catch (error) {
    console.error('Error loading device users:', error);
    showToast('خطأ في الاتصال', true);
    showEmptyDeviceUsers();
  } finally {
    loadingElement.style.display = 'none';
  }
}

// Render device users in the table
function renderDeviceUsers(users) {
  const tableBody = document.getElementById('deviceUsersTableBody');
  const emptyElement = document.getElementById('deviceUsersEmpty');
  const table = document.getElementById('deviceUsersTable');
  
  if (!users || users.length === 0) {
    showEmptyDeviceUsers();
    return;
  }
  
  tableBody.innerHTML = users.map(user => `
    <tr>
      <td class="text-center">${user.userId || user.uid || 'غير محدد'}</td>
      <td class="text-center">${user.name || 'غير محدد'}</td>
      <td class="text-center">${user.deviceName || 'غير محدد'}</td>
      <td class="text-center">${user.deviceIp || 'غير محدد'}</td>
      <td class="text-center">
        <span class="badge ${getPrivilegeBadgeClass(user.privilege)}">
          ${getPrivilegeText(user.privilege)}
        </span>
      </td>
      <td class="text-center">
        <span class="badge ${user.enabled ? 'bg-success' : 'bg-danger'}">
          ${user.enabled ? 'مفعل' : 'معطل'}
        </span>
      </td>
      <td class="text-center">
        <button class="btn btn-sm btn-danger" onclick="deleteDeviceUser('${user.userId || user.uid}')" title="حذف المستخدم">
          <i class="material-symbols-rounded">delete</i>
        </button>
      </td>
    </tr>
  `).join('');
  
  table.style.display = 'table';
  emptyElement.style.display = 'none';
}

// Show empty state for device users
function showEmptyDeviceUsers() {
  const emptyElement = document.getElementById('deviceUsersEmpty');
  const table = document.getElementById('deviceUsersTable');
  
  table.style.display = 'none';
  emptyElement.style.display = 'block';
}

// Get privilege badge class
function getPrivilegeBadgeClass(privilege) {
  switch (privilege) {
    case 0: return 'bg-primary'; // Admin
    case 1: return 'bg-info';    // User
    case 2: return 'bg-warning'; // Guest
    default: return 'bg-secondary';
  }
}

// Get privilege text
function getPrivilegeText(privilege) {
  switch (privilege) {
    case 0: return 'مدير';
    case 1: return 'مستخدم';
    case 2: return 'ضيف';
    default: return 'غير محدد';
  }
}

// Delete device user
async function deleteDeviceUser(userId) {
  try {
    console.log(`Attempting to delete user: ${userId}`);
    
    const result = await Swal.fire({
      title: 'تأكيد الحذف',
      text: `هل أنت متأكد من حذف المستخدم ${userId} من الجهاز؟`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      console.log(`User confirmed deletion of: ${userId}`);
      
      // Show loading
      showToast('جاري حذف المستخدم...');
      
      const response = await fetch(`/employee/device-users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`Response status: ${response.status}`);
      const responseText = await response.text();
      console.log(`Response text: ${responseText}`);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        data = { success: false, message: 'Invalid response from server' };
      }
      
      console.log(`Parsed data:`, data);
      
      if (response.ok && data.success) {
        showToast('تم حذف المستخدم بنجاح');
        // Reload the table after a short delay
        setTimeout(() => {
          loadDeviceUsers();
        }, 1000);
      } else {
        const errorMsg = data.message || data.error || `HTTP ${response.status}: فشل في حذف المستخدم`;
        console.error('Deletion failed:', errorMsg);
        showToast(errorMsg, true);
      }
    }
  } catch (error) {
    console.error('Error deleting device user:', error);
    showToast(`خطأ في الاتصال: ${error.message}`, true);
  }
}

// Test listener connection
async function testListenerConnection() {
  try {
    showToast('جاري اختبار الاتصال...');
    
    const response = await fetch('/employee/test-listener-connection');
    const data = await response.json();
    
    if (data.success) {
      showToast('الاتصال بخدمة البصمة يعمل بشكل صحيح');
      console.log('Listener connection test successful:', data);
    } else {
      showToast(`فشل في الاتصال: ${data.message}`, true);
      console.error('Listener connection test failed:', data);
    }
  } catch (error) {
    showToast(`خطأ في اختبار الاتصال: ${error.message}`, true);
    console.error('Error testing listener connection:', error);
  }
}

// Filter device users by device and search
function filterDeviceUsers() {
  const deviceFilter = document.getElementById('deviceUsersFilter');
  const searchInput = document.getElementById('searchDeviceUsers');
  const selectedDeviceId = deviceFilter.value;
  const searchTerm = (searchInput ? searchInput.value : '').toLowerCase();
  
  let filteredUsers = deviceUsersData;
  
  // Filter by device
  if (selectedDeviceId) {
    filteredUsers = filteredUsers.filter(user => 
      user.deviceId === selectedDeviceId
    );
  }
  
  // Filter by search term (code or name)
  if (searchTerm) {
    filteredUsers = filteredUsers.filter(user => {
      const userId = (user.userId || user.uid || '').toString().toLowerCase();
      const userName = (user.name || '').toLowerCase();
      return userId.includes(searchTerm) || userName.includes(searchTerm);
    });
  }
  
  renderDeviceUsers(filteredUsers);
}

// Initialize form
document.addEventListener('DOMContentLoaded', function() {
  // Load students table
  loadStudents();
  
  // Load device users
  loadDeviceUsers();
  
  // Add search and filter event listeners
  if (searchStudentsInput) {
    searchStudentsInput.addEventListener('input', filterStudents);
  }
  
  if (filterByGroupSelect) {
    filterByGroupSelect.addEventListener('change', filterStudents);
  }
  
  // Add device users filter event listener
  const deviceUsersFilter = document.getElementById('deviceUsersFilter');
  if (deviceUsersFilter) {
    deviceUsersFilter.addEventListener('change', filterDeviceUsers);
  }
  
  // Add device users search event listener
  const searchDeviceUsers = document.getElementById('searchDeviceUsers');
  if (searchDeviceUsers) {
    searchDeviceUsers.addEventListener('input', filterDeviceUsers);
  }
  
  // Add form validation
  addStudentForm.addEventListener('input', function() {
    // Real-time validation can be added here
  });
});

console.log('Add Student JavaScript loaded - Professional design');