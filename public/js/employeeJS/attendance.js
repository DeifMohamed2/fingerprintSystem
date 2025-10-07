
const attendStudentForm = document.getElementById('attendStudentForm');
const searchStudent = document.getElementById('searchStudent');
const spinner = document.getElementById('spinner');
const studentTable = document.getElementById('studentTable');
const groupSelection = document.getElementById('groupSelection');
const reloadButton = document.getElementById('reloadButton');
const tBody = document.querySelector('#studentTable tbody');
const message = document.getElementById('message');
const totalStudents = document.getElementById('totalStudents');
const invoiceForm = document.getElementById('invoiceForm');
const invoiceTBody = document.querySelector('#invoiceTable tbody');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const mockCheck = document.getElementById('mockCheck');

let temp3Student = 0;
async function attendStudent(event) {
    event.preventDefault();
    
    // Show spinner and hide messages
    spinner.classList.remove('d-none');
    
    const formData = new FormData(attendStudentForm);
    
    const data = Object.fromEntries(formData);
    
    data.groupId = groupSelection.value;
    console.log('📤 Sending attendance request:', {
        searchStudent: data.searchStudent,
        groupId: data.groupId,
        selectedGroupText: groupSelection.options[groupSelection.selectedIndex]?.text
    });
    try {
        const response = await fetch('/employee/attend-student', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        });
        const responseData = await response.json();
        console.log(responseData);
        if (response.ok) {
        addStudentsToTable(responseData.students , data.groupId);    
        spinner.classList.add('d-none');
        attendStudentForm.reset();
      
        message.textContent = responseData.message;
          searchStudent.focus();
          
          // Check if monthly payment is due
          if (!responseData.studentData.monthlyPaymentPaid) {
            showMonthlyPaymentWarning(responseData.studentData);
          }
           temp3Student++;
          if(temp3Student == 5){
            getStudents();
            temp3Student = 0;
          }
    
        } else {
        spinner.classList.add('d-none');
        attendStudentForm.reset();
        
        // Check if student is blocked
        if (response.status === 403 && responseData.message === 'هذا الطالب محظور من المركز') {
          Swal.fire({
            icon: 'error',
            title: 'طالب محظور',
            html: `
              <p><strong>${responseData.message}</strong></p>
              <p><strong>سبب الحظر:</strong> ${responseData.blockReason || 'غير محدد'}</p>
              <p><strong>تاريخ الحظر:</strong> ${responseData.blockedAt ? new Date(responseData.blockedAt).toLocaleDateString() : 'غير محدد'}</p>
            `,
            confirmButtonText: 'حسناً'
          });
        } else if (response.status === 403 && responseData.message === 'هذا الطالب غير مسجل في المجموعة المختارة') {
          // Show detailed information about student's groups
          const studentGroups = responseData.studentGroups || [];
          Swal.fire({
            icon: 'warning',
            title: 'طالب غير مسجل في المجموعة',
            html: `
              <p><strong>${responseData.message}</strong></p>
              <p><strong>المجموعات المسجل فيها الطالب:</strong></p>
              <ul>
                ${studentGroups.map(group => `<li>${group}</li>`).join('')}
              </ul>
              <p>يرجى اختيار المجموعة الصحيحة أو تغيير المجموعة المختارة.</p>
            `,
            confirmButtonText: 'حسناً'
          });
        } else {
          message.textContent = responseData.message;
        }
        
        searchStudent.focus();
         
        }
    } catch (error) {
        attendStudentForm.reset();
        searchStudent.focus();
        spinner.classList.add('d-none');
        console.error('Error attending student:', error);
    }
}

attendStudentForm.addEventListener('submit', attendStudent);



const getStudents = async () => {
    try {
    tBody.innerHTML = '';
    totalStudents.textContent = '0';
    
    const groupId = groupSelection.value;
    if (!groupId) {
        message.textContent = 'يرجى اختيار مجموعة أولاً';
        return;
    }
    
    spinner.classList.remove('d-none');
    const response = await fetch(`/employee/get-attended-students?groupId=${groupId}`);
    const responseData = await response.json();
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Populate table
    addStudentsToTable(responseData.students , groupId);
    spinner.classList.add('d-none');
    searchStudent.focus();
    message.textContent = responseData.message;
    totalStudents.textContent = responseData.students.length;

    setTimeout(() => {
        message.textContent = '';
    },3000)
    } catch (error) {
    console.error('Error fetching students:', error);
    spinner.classList.add('d-none');
    searchStudent.focus();
    message.textContent = 'لم يتم تسجيل اي طلاب اليوم';
    }
}

// Reload button
reloadButton.addEventListener('click', getStudents);
groupSelection.addEventListener('change', getStudents);


// Function to add students to the tbody

const addStudentsToTable = (students, groupId) => {
    tBody.innerHTML = '';
    let hasUnpaidStudents = false;
    
     students.forEach((student) => {
       const tr = document.createElement('tr');
      // Payment type is always per session
      const paymentTypeBadge = '<span class="badge bg-info text-white">Per Session</span>';
      
      // Check if monthly payment is due (first day of month)
      const today = new Date();
      const isFirstOfMonth = today.getDate() === 1;
      const monthlyPaymentPaid = student.student.monthlyPaymentPaid;
      const shouldShowWarning = isFirstOfMonth && !monthlyPaymentPaid;
      
      // Track if there are unpaid students
      if (!monthlyPaymentPaid) {
        hasUnpaidStudents = true;
      }
      
      tr.innerHTML = `
            <td class="text-center">${student.student.studentName}</td>
            <td class="text-center">${student.student.studentCode}</td>
            <td class="text-center">${student.student.studentPhoneNumber}</td>
            <td class="text-center">${student.student.studentParentPhone}</td>
            <td class="text-center">${
              student.attendanceCount || 'Waiting for refresh'
            }</td>
            <td class="text-center">
              ${monthlyPaymentPaid ? 
                '<span class="badge bg-success">مدفوع</span>' : 
                '<span class="badge bg-danger">غير مدفوع</span>'
              }
            </td>
            <td class="text-center">
              <button class="btn btn-danger btn-sm delete">Delete</button>
              ${!monthlyPaymentPaid ? 
                `<button class="btn btn-success btn-sm pay-monthly" data-student-id="${student.student._id}">دفع شهري</button>` : 
                ''
              }
            </td>
            <td class="text-center">${student.addedBy.employeeName}</td>
          `;

       // Event listeners
       tr.querySelector('.delete').addEventListener('click', (event) => {
         const row = event.target.closest('tr');
         const studentId = row.querySelector('[data-student-id]').dataset.studentId;
         deleteStudent(studentId , groupId);
       });

       // Monthly payment button event listener
       const monthlyPaymentBtn = tr.querySelector('.pay-monthly');
       if (monthlyPaymentBtn) {
         monthlyPaymentBtn.addEventListener('click', (event) => {
           const studentId = event.target.dataset.studentId;
           payMonthlyFee(studentId);
         });
       }

       // Show warning modal for unpaid monthly fees on first day of month
       if (shouldShowWarning) {
         showMonthlyPaymentWarning(student.student);
       }

       // Event listeners remain the same
       tBody.appendChild(tr);
     });
     

};

// Function to delete student

async function deleteStudent(studentId , groupId) {
    try {
        
        spinner.classList.remove('d-none');
        const response = await fetch(`/employee/delete-attend-student/${studentId}?groupId=${groupId}`, {
          method: 'DELETE',
        });
        const responseData = await response.json();
        if (response.ok) {
        console.log(responseData.students);
        getStudents();
        searchStudent.focus();
        spinner.classList.add('d-none');
        message.textContent = responseData.message
        } else {
        alert(responseData.message);
        searchStudent.focus();
        spinner.classList.add('d-none');
        message.textContent = responseData.message
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        searchStudent.focus();
        spinner.classList.add('d-none');
        message.textContent = 'An error occurred. Please try again later.';
    }
}

// Function to pay monthly fee
async function payMonthlyFee(studentId) {
    try {
        const response = await fetch(`/employee/pay-monthly-fee/${studentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
        });
        const responseData = await response.json();
        if (response.ok) {
            getStudents();
            searchStudent.focus();
            message.textContent = responseData.message;
            Swal.fire({
                icon: 'success',
                title: 'تم الدفع',
                text: responseData.message,
            });
        } else {
            alert(responseData.message);
            searchStudent.focus();
            message.textContent = responseData.message;
        }
    } catch (error) {
        console.error('Error paying monthly fee:', error);
        searchStudent.focus();
        message.textContent = 'An error occurred. Please try again later.';
    }
}

// Function to show monthly payment warning (modal only, no sound)
function showMonthlyPaymentWarning(student) {
    // Play warning sound - using a more noticeable beep sound
    playWarningSound();
    
    Swal.fire({
        icon: 'warning',
        title: 'تحذير: دفع شهري مطلوب',
        html: `الطالب <b>${student.studentName}</b> لم يدفع الرسوم الشهرية لهذا الشهر`,
        confirmButtonText: 'حسناً',
        allowOutsideClick: false,
        showCloseButton: true,
        confirmButtonColor: '#ff6b35',
        cancelButtonColor: '#6c757d'
    });
}

// Function to play warning sound using MP3 file
function playWarningSound() {
    try {
        // Use the provided MP3 alert sound
        const audio = new Audio('/mp3/aler.mp3');
        audio.volume = 0.8; // Set volume to 80%
        
        // Play the sound
        audio.play().then(() => {
            console.log('Alert sound played successfully');
        }).catch(error => {
            console.error('Failed to play alert sound:', error);
            
            // Fallback: try to play again with different settings
            setTimeout(() => {
                const fallbackAudio = new Audio('/mp3/aler.mp3');
                fallbackAudio.volume = 0.5;
                fallbackAudio.play().catch(fallbackError => {
                    console.error('Fallback audio also failed:', fallbackError);
                });
            }, 100);
        });
        
    } catch (error) {
        console.error('Error creating audio object:', error);
    }
}

// download Excel File

downloadExcelBtn.addEventListener('click', async () => {
    try {
        downloadExcelBtn.innerHTML = 'جاري التحميل...';
        const groupId = groupSelection.value;
        const response = await fetch(`/employee/download-attendance-excel?groupId=${groupId}`);
        if (!response.ok) {
   
        throw new Error('Failed to download excel file');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toLocaleDateString().replace(/\//g, '-');
        a.download = `كشف حضور الطلاب - ${date}.xlsx`;
        a.click();
        downloadExcelBtn.innerHTML = '<i class="material-symbols-rounded text-sm">download</i>&nbsp;&nbsp;Download Excel And Send Copy';
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading excel file:', error);
    }
});





// Function to convert table to Excel sheet
function tableToExcel() {
  const table = document.getElementById('studentTable');
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const headers = ['#', 'Student Name', 'Parent Phone', 'Student Code'];

  const data = rows.map((row, index) => {
    const cells = row.querySelectorAll('td');
    return [
      index + 1,
      cells[0].textContent,
      cells[3].textContent,
      cells[1].textContent,
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Style headers
  const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
  for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
    cell.s = {
      fill: {
        fgColor: { rgb: 'FFFF00' },
      },
      font: {
        bold: true,
      },
    };
  }

  XLSX.writeFile(workbook, 'Student_Attendance.xlsx');
}

// Add event listener to download Excel button
document.getElementById('AssistantExcelBtn').addEventListener('click', tableToExcel);

// Quick Notifications Functionality
document.addEventListener('DOMContentLoaded', function() {
  const quickNotificationType = document.getElementById('quickNotificationType');
  const quickNotificationFilter = document.getElementById('quickNotificationFilter');
  const quickNotificationMessage = document.getElementById('quickNotificationMessage');
  const sendQuickNotificationsBtn = document.getElementById('sendQuickNotificationsBtn');
  const quickNotificationStatus = document.getElementById('quickNotificationStatus');

  // Update message when type changes
  quickNotificationType?.addEventListener('change', function() {
    updateQuickNotificationMessage();
  });

  // Update message when filter changes
  quickNotificationFilter?.addEventListener('change', function() {
    updateQuickNotificationMessage();
  });

  // Send quick notifications
  sendQuickNotificationsBtn?.addEventListener('click', function() {
    sendQuickNotifications();
  });

  function updateQuickNotificationMessage() {
    const type = quickNotificationType?.value;
    const filter = quickNotificationFilter?.value;
    
    let defaultMessage = '';
    
    if (type === 'balance') {
      defaultMessage = 'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م في كورس {courseName} مع الأستاذ {teacherName}. يرجى التواصل معنا لتسديد المبلغ المتبقي.';
    } else if (type === 'installment') {
      defaultMessage = 'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م من إجمالي {totalCourseCost} ج.م في كورس {courseName}. يرجى التواصل معنا لدفع القسط التالي.';
    }
    
    if (defaultMessage && quickNotificationMessage) {
      quickNotificationMessage.value = defaultMessage;
    }
  }

  async function sendQuickNotifications() {
    const type = quickNotificationType?.value;
    const filter = quickNotificationFilter?.value;
    const message = quickNotificationMessage?.value;

    if (!message || !message.trim()) {
      showQuickNotificationToast('يرجى كتابة الرسالة', 'error');
      return;
    }

    // Get students based on filter
    let students = [];
    
    try {
      let endpoint = '';
      switch (filter) {
        case 'withBalances':
          endpoint = '/employee/api/students-with-balances';
          break;
        case 'perSession':
          endpoint = '/employee/api/students-with-balances?paymentType=perSession';
          break;
        case 'all':
        default:
          endpoint = '/employee/api/students-with-balances';
          break;
      }

      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok) {
        students = data.students;
      } else {
        throw new Error(data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showQuickNotificationToast('فشل في جلب بيانات الطلاب', 'error');
      return;
    }

    if (students.length === 0) {
      showQuickNotificationToast('لا يوجد طلاب للرسالة المحددة', 'warning');
      return;
    }

    // Confirm sending
    const confirmed = await showQuickNotificationConfirmation(
      `هل أنت متأكد من إرسال ${students.length} إشعار؟`,
      'إرسال الإشعارات السريعة'
    );

    if (!confirmed) return;

    // Show loading
    sendQuickNotificationsBtn.disabled = true;
    sendQuickNotificationsBtn.innerHTML = '<i class="material-symbols-rounded text-sm me-1">hourglass_empty</i>جاري الإرسال...';
    quickNotificationStatus.textContent = 'جاري الإرسال...';

    try {
      const response = await fetch('/employee/send-bulk-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: students,
          message: message,
          notificationType: type
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showQuickNotificationToast(data.message, 'success');
        quickNotificationStatus.textContent = data.message;
        quickNotificationMessage.value = '';
      } else {
        throw new Error(data.message || 'Failed to send notifications');
      }
    } catch (error) {
      console.error('Error sending quick notifications:', error);
      showQuickNotificationToast('فشل في إرسال الإشعارات', 'error');
      quickNotificationStatus.textContent = 'فشل في الإرسال';
    } finally {
      // Reset button
      sendQuickNotificationsBtn.disabled = false;
      sendQuickNotificationsBtn.innerHTML = '<i class="material-symbols-rounded text-sm me-1">send</i>إرسال إشعارات سريعة';
    }
  }

  function showQuickNotificationToast(message, type = 'info') {
    if (type === 'success') {
      Swal.fire({
        icon: 'success',
        title: 'نجح',
        text: message,
        timer: 3000,
        showConfirmButton: false
      });
    } else if (type === 'error') {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: message,
        timer: 3000,
        showConfirmButton: false
      });
    } else if (type === 'warning') {
      Swal.fire({
        icon: 'warning',
        title: 'تحذير',
        text: message,
        timer: 3000,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'معلومات',
        text: message,
        timer: 3000,
        showConfirmButton: false
      });
    }
  }

  async function showQuickNotificationConfirmation(message, title = 'تأكيد') {
    const result = await Swal.fire({
      title: title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'نعم',
      cancelButtonText: 'إلغاء'
    });
    
    return result.isConfirmed;
  }

  // Initialize default message
  updateQuickNotificationMessage();
});

// ================= Fingerprint Realtime Integration =================
// Listen for fingerprint scan events from backend and auto-attend
(function setupFingerprintSocket() {
  try {
    const socket = io();
    socket.on('connect', () => {
      console.log('Socket connected for fingerprint events');
    });
    socket.on('attendance', async (event) => {
      // event: { userId: string, time: string }
      try {
        if (!groupSelection.value) {
          // Require group selection
          return;
        }
        // Auto-fill the search input with the scanned userId and submit
        searchStudent.value = event?.userId || '';
        // Submit using the same logic as manual add
        const submitEvent = new Event('submit');
        attendStudent(submitEvent);
      } catch (err) {
        console.error('Error handling fingerprint attendance:', err);
      }
    });
  } catch (error) {
    console.error('Socket init failed:', error);
  }
})();

// Auto-load students when page loads if group is already selected
document.addEventListener('DOMContentLoaded', function() {
  // Check if group is selected and load students
  if (groupSelection && groupSelection.value) {
    getStudents();
  }
});