// Student Logs JavaScript - Updated for Group-based system

document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchInput');
  const searchForm = document.getElementById('searchForm');
  const message = document.getElementById('message');
  const studentDetails = document.getElementById('studentDetails');
  const studentNameEl = document.getElementById('studentName');
  const studentCodeEl = document.getElementById('studentCode');
  const studentPhoneEl = document.getElementById('studentPhone');
  const parentPhoneEl = document.getElementById('parentPhone');
  const schoolNameEl = document.getElementById('schoolName');
  const studentGroupsEl = document.getElementById('studentGroups');
  const lastPaymentDateEl = document.getElementById('lastPaymentDate');
  const monthlyStatusEl = document.getElementById('monthlyStatus');
  const backToSearchBtn = document.getElementById('backToSearch');

  const groupFilter = document.getElementById('groupFilter');
  const startDateFilter = document.getElementById('startDateFilter');
  const endDateFilter = document.getElementById('endDateFilter');
  const applyFiltersBtn = document.getElementById('applyFilters');
  const resetFiltersBtn = document.getElementById('resetFilters');

  const attendanceTableBody = document.getElementById('attendanceTableBody');
  const noAttendanceMessage = document.getElementById('noAttendanceMessage');
  const monthlyPaymentTableBody = document.getElementById('monthlyPaymentTableBody');
  const noMonthlyPaymentMessage = document.getElementById('noMonthlyPaymentMessage');

  const spinner = document.getElementById('spinner');

  function setLoading(show) {
    if (!spinner) return;
    spinner.classList.toggle('d-none', !show);
  }

  function clearMessage() {
    if (message) message.textContent = '';
  }

  function showMessage(text) {
    if (message) message.textContent = text;
  }

  searchForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const term = (searchInput.value || '').trim();
    if (!term) {
      showMessage('يرجى إدخال الاسم أو الكود');
      return;
    }
    await loadStudent(term);
  });

  backToSearchBtn.addEventListener('click', function() {
    studentDetails.style.display = 'none';
    clearMessage();
  });

  applyFiltersBtn.addEventListener('click', async function() {
    const studentId = studentDetails.dataset.sid;
    if (!studentId) return;
    await loadAttendance(studentId);
  });

  resetFiltersBtn.addEventListener('click', async function() {
    groupFilter.value = '';
    startDateFilter.value = '';
    endDateFilter.value = '';
    const studentId = studentDetails.dataset.sid;
    if (!studentId) return;
    await loadAttendance(studentId);
  });

  async function loadStudent(term) {
    try {
      setLoading(true);
      // search endpoint already exists
      const resp = await fetch(`/employee/search-student?searchStudent=${encodeURIComponent(term)}`);
      const data = await resp.json();
      if (!resp.ok || !data || !data.student) {
        showMessage('الطالب غير موجود');
        return;
      }
      const student = data.student;
      studentDetails.style.display = '';
      studentDetails.dataset.sid = student._id;
      renderStudent(student);
      await loadAttendance(student._id);
    } catch (e) {
      showMessage('حدث خطأ أثناء البحث');
    } finally {
      setLoading(false);
    }
  }

  function renderStudent(student) {
    studentNameEl.textContent = student.studentName || 'معلومات الطالب';
    studentCodeEl.textContent = student.studentCode || '';
    studentPhoneEl.textContent = student.studentPhoneNumber || '';
    parentPhoneEl.textContent = student.studentParentPhone || '';
    schoolNameEl.textContent = student.schoolName || '';
    
    // Display all groups
    if (student.groups && student.groups.length > 0) {
      const groupNames = student.groups.map(g => g.groupName || g).join(', ');
      studentGroupsEl.textContent = groupNames;
    } else {
      studentGroupsEl.textContent = 'غير محدد';
    }
    
    if (student.lastMonthlyPayment && student.lastMonthlyPayment.date) {
      lastPaymentDateEl.textContent = new Date(student.lastMonthlyPayment.date).toLocaleDateString('ar-EG');
    } else if (student.monthlyPaymentDate) {
      lastPaymentDateEl.textContent = new Date(student.monthlyPaymentDate).toLocaleDateString('ar-EG');
    } else {
      lastPaymentDateEl.textContent = '—';
    }
    monthlyStatusEl.textContent = student.monthlyPaymentPaid ? 'مدفوع' : 'غير مدفوع';
  }

  function updateAttendanceStats(attendanceRecords) {
    const totalAttendance = attendanceRecords.length;
    const totalAttendanceEl = document.getElementById('totalAttendance');
    const attendanceRateEl = document.getElementById('attendanceRate');
    
    if (totalAttendanceEl) {
      totalAttendanceEl.textContent = totalAttendance;
    }
    
    if (attendanceRateEl) {
      // For now, we'll show 100% if there are any attendance records
      // You can modify this logic based on your requirements
      const rate = totalAttendance > 0 ? 100 : 0;
      attendanceRateEl.textContent = `${rate}%`;
    }
  }

  async function loadAttendance(studentId) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (groupFilter.value) params.set('groupId', groupFilter.value);
      if (startDateFilter.value && endDateFilter.value) {
        params.set('startDate', startDateFilter.value);
        params.set('endDate', endDateFilter.value);
      }
      const resp = await fetch(`/employee/student-logs-data/${studentId}?${params.toString()}`);
      const data = await resp.json();
      if (!resp.ok) {
        showMessage('فشل تحميل السجلات');
        return;
      }
      renderStudent(data.student);
      renderAttendance(data.attendanceRecords || []);
      renderMonthlyPaymentHistory(data.monthlyPaymentHistory || []);
      updateAttendanceStats(data.attendanceRecords || []);
      populateGroupFilter(data.student);
    } catch (e) {
      showMessage('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }

  function renderAttendance(records) {
    attendanceTableBody.innerHTML = '';
    if (!records.length) {
      noAttendanceMessage.style.display = '';
      return;
    }
    noAttendanceMessage.style.display = 'none';
    records.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center">${idx + 1}</td>
        <td class="text-center">${r.date}</td>
        <td class="text-center">${r.group && r.group.groupName ? r.group.groupName : '—'}</td>
        <td class="text-center">${r.addedBy && r.addedBy.employeeName ? r.addedBy.employeeName : '—'}</td>
      `;
      attendanceTableBody.appendChild(tr);
    });
  }

  function renderMonthlyPaymentHistory(records) {
    monthlyPaymentTableBody.innerHTML = '';
    if (!records.length) {
      noMonthlyPaymentMessage.style.display = '';
      return;
    }
    noMonthlyPaymentMessage.style.display = 'none';
    
    // Sort records by date (newest first)
    const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedRecords.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center">${idx + 1}</td>
        <td class="text-center">${new Date(r.date).toLocaleDateString('ar-EG')}</td>
        <td class="text-center">${r.paidBy && r.paidBy.employeeName ? r.paidBy.employeeName : '—'}</td>
      `;
      monthlyPaymentTableBody.appendChild(tr);
    });
  }

  function populateGroupFilter(student) {
    if (!student) return;
    groupFilter.innerHTML = '<option value="">جميع المجموعات</option>';
    
    // Add all groups
    if (student.groups && student.groups.length > 0) {
      student.groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group._id || group;
        option.textContent = group.groupName || group;
        groupFilter.appendChild(option);
      });
    }
  }
});