// Enhanced Attendance Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const attendanceForm = document.getElementById('attendanceByDateForm');
    const reloadButton = document.getElementById('reloadButton');
    const downloadExcelBtn = document.getElementById('downloadExcelBtn');
    const spinner = document.getElementById('spinner');
    const message = document.getElementById('message');
    const studentTable = document.getElementById('studentTable');

    let currentFilters = {
        startDate: '',
        endDate: '',
        groupId: '',
        searchStudent: ''
    };

    // Set default dates (today and 30 days ago)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];

    // Form submission handler
    attendanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        currentFilters = {
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            groupId: document.getElementById('groupSelect').value,
            searchStudent: document.getElementById('searchStudent').value
        };

        if (!currentFilters.startDate || !currentFilters.endDate) {
            showMessage('يرجى تحديد تاريخ البداية والنهاية', 'error');
            return;
        }

        await loadAttendanceData();
    });

    // Download Excel handler
    downloadExcelBtn.addEventListener('click', async function() {
        if (!currentFilters.startDate || !currentFilters.endDate) {
            showMessage('يرجى تحديد تاريخ البداية والنهاية أولاً', 'error');
            return;
        }

        try {
            showSpinner(true);
            
            const params = new URLSearchParams({
                startDate: currentFilters.startDate,
                endDate: currentFilters.endDate,
                groupId: currentFilters.groupId || '',
                searchStudent: currentFilters.searchStudent || ''
            });

            const response = await fetch(`/employee/download-attendance-excel-by-date-range?${params}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `attendance_report_${currentFilters.startDate}_to_${currentFilters.endDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                showMessage('تم تحميل ملف Excel بنجاح', 'success');
            } else {
                const error = await response.json();
                showMessage(error.message || 'حدث خطأ في تحميل الملف', 'error');
            }
        } catch (error) {
            console.error('Error downloading Excel:', error);
            showMessage('حدث خطأ في تحميل الملف', 'error');
        } finally {
            showSpinner(false);
        }
    });

    // Real-time search functionality
    const searchInput = document.getElementById('searchStudent');
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (currentFilters.startDate && currentFilters.endDate) {
                loadAttendanceData();
            }
        }, 500); // Debounce search by 500ms
    });

    // Group selection change handler
    document.getElementById('groupSelect').addEventListener('change', function() {
        if (currentFilters.startDate && currentFilters.endDate) {
            loadAttendanceData();
        }
    });

    // Load attendance data
    async function loadAttendanceData() {
        try {
            showSpinner(true);
            clearMessage();

            const params = new URLSearchParams({
                startDate: currentFilters.startDate,
                endDate: currentFilters.endDate,
                groupId: currentFilters.groupId || '',
                searchStudent: currentFilters.searchStudent || ''
            });

            const response = await fetch(`/employee/attendance-by-date?${params}`);
            const data = await response.json();

            if (response.ok) {
                displayAttendanceData(data);
                showMessage(`تم تحميل ${data.totalStudents} طالب`, 'success');
            } else {
                showMessage(data.message || 'حدث خطأ في تحميل البيانات', 'error');
                clearTables();
            }
        } catch (error) {
            console.error('Error loading attendance data:', error);
            showMessage('حدث خطأ في تحميل البيانات', 'error');
            clearTables();
        } finally {
            showSpinner(false);
        }
    }

    // Display attendance data
    function displayAttendanceData(data) {
        // Display students table
        displayStudentsTable(data.students);
    }

    // Display students table
    function displayStudentsTable(students) {
        const tbody = studentTable.querySelector('tbody');
        tbody.innerHTML = '';

        if (!students || students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">لا توجد بيانات</td></tr>';
            return;
        }

        students.forEach((student, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-center">${index + 1}</td>
                <td class="text-center">${student.studentName}</td>
                <td class="text-center">${student.studentCode}</td>
                <td class="text-center">${student.studentPhone}</td>
                <td class="text-center">${student.parentPhone}</td>
                <td class="text-center">${student.groupName}</td>
                <td class="text-center">${formatDate(student.attendanceDate)}</td>
                <td class="text-center">${student.addedBy}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-info edit-student-btn" onclick="viewStudentDetails('${student.studentId}')">
                        عرض التفاصيل
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }


    // Utility functions
    function showSpinner(show) {
        spinner.style.display = show ? 'block' : 'none';
    }

    function showMessage(text, type = 'info') {
        message.textContent = text;
        message.className = `message text-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
        message.style.display = 'block';
    }

    function clearMessage() {
        message.style.display = 'none';
        message.textContent = '';
    }

    function clearTables() {
        studentTable.querySelector('tbody').innerHTML = '<tr><td colspan="9" class="text-center">لا توجد بيانات</td></tr>';
    }

    function formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG');
    }

    // Global function for viewing student details
    window.viewStudentDetails = function(studentId) {
        // You can implement a modal or redirect to student details page
        console.log('View student details:', studentId);
        // For now, just show an alert
        alert(`عرض تفاصيل الطالب: ${studentId}`);
    };

    // Initialize with default data if dates are set
    if (document.getElementById('startDate').value && document.getElementById('endDate').value) {
        loadAttendanceData();
    }
});