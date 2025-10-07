// Notifications JavaScript - Updated for Group-based system

class NotificationManager {
  constructor() {
    this.students = [];
    this.filteredStudents = [];
    this.groups = [];
    this.templates = [];
    this.currentPage = 1;
    this.studentsPerPage = 10;
    this.totalCount = 0;
    this.searchTerm = '';
    this.selectedGroup = '';
    this.selectedPaymentType = '';
    this.isLoading = false;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadData();
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.currentPage = 1;
        this.filterAndRenderStudents();
      });
    }

    // Filter functionality
    const groupFilter = document.getElementById('groupFilter');
    if (groupFilter) {
      groupFilter.addEventListener('change', () => {
        this.selectedGroup = groupFilter.value;
        this.currentPage = 1;
        this.filterAndRenderStudents();
      });
    }

    const paymentTypeFilter = document.getElementById('paymentTypeFilter');
    if (paymentTypeFilter) {
      paymentTypeFilter.addEventListener('change', () => {
        this.selectedPaymentType = paymentTypeFilter.value;
        this.currentPage = 1;
        this.filterAndRenderStudents();
      });
    }

    // Pagination
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.filterAndRenderStudents();
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.totalCount / this.studentsPerPage);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.filterAndRenderStudents();
        }
      });
    }

    // Template selection
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) {
      templateSelect.addEventListener('change', () => {
        this.updateMessageFromTemplate(templateSelect.value);
      });
    }

    // Bulk notification functionality
    const bulkGroupFilter = document.getElementById('bulkGroupFilter');
    if (bulkGroupFilter) {
      bulkGroupFilter.addEventListener('change', () => this.updateBulkFilters());
    }

    // Send notification buttons
    const sendNotificationBtn = document.getElementById('sendNotificationBtn');
    if (sendNotificationBtn) {
      sendNotificationBtn.addEventListener('click', () => this.sendNotification());
    }

    const sendBulkNotificationBtn = document.getElementById('sendBulkNotificationBtn');
    if (sendBulkNotificationBtn) {
      sendBulkNotificationBtn.addEventListener('click', () => this.sendBulkNotifications());
    }
  }

  async loadData() {
    this.isLoading = true;
    this.showLoading();
    
    try {
      // Load data in parallel for better performance
      const [studentsResponse, groupsResponse, templatesResponse] = await Promise.all([
        this.fetchStudentsWithBalances(),
        this.fetchGroups(),
        this.fetchTemplates()
      ]);

      this.students = studentsResponse;
      this.groups = groupsResponse;
      this.templates = templatesResponse;
      
      this.populateGroupFilter();
      this.populateTemplateFilters();
      this.filterAndRenderStudents();
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('حدث خطأ في تحميل البيانات');
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  async fetchStudentsWithBalances() {
    try {
      const response = await fetch('/employee/students-with-balances');
      const data = await response.json();
      
      if (response.ok) {
        return data || [];
      } else {
        throw new Error('Failed to load students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }

  async fetchGroups() {
    try {
      const response = await fetch('/employee/groups');
      const data = await response.json();
      
      if (response.ok) {
        return data || [];
      } else {
        throw new Error('Failed to load groups');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      return [];
    }
  }

  async fetchTemplates() {
    try {
      const response = await fetch('/employee/notification-templates');
      const data = await response.json();
      
      if (response.ok) {
        return data || [];
      } else {
        throw new Error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  populateGroupFilter() {
    const groupFilter = document.getElementById('groupFilter');
    const bulkGroupFilter = document.getElementById('bulkGroupFilter');
    
    if (!this.groups) return;

    // Populate main group filter
    if (groupFilter) {
      while (groupFilter.children.length > 1) {
        groupFilter.removeChild(groupFilter.lastChild);
      }
      
      this.groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group._id;
        option.textContent = group.groupName;
        groupFilter.appendChild(option);
      });
    }

    // Populate bulk group filter
    if (bulkGroupFilter) {
      while (bulkGroupFilter.children.length > 1) {
        bulkGroupFilter.removeChild(bulkGroupFilter.lastChild);
      }
      
      this.groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group._id;
        option.textContent = group.groupName;
        bulkGroupFilter.appendChild(option);
      });
    }
  }

  populateTemplateFilters() {
    const templateSelect = document.getElementById('templateSelect');
    if (!templateSelect || !this.templates) return;

    while (templateSelect.children.length > 1) {
      templateSelect.removeChild(templateSelect.lastChild);
    }
    
      this.templates.forEach(template => {
        const option = document.createElement('option');
      option.value = template.type;
        option.textContent = template.name;
      templateSelect.appendChild(option);
      });
  }

  filterAndRenderStudents() {
    this.filteredStudents = this.students.filter(student => {
      const matchesSearch = !this.searchTerm || 
        student.studentName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.studentCode?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.studentPhone?.includes(this.searchTerm) ||
        student.parentPhone?.includes(this.searchTerm);

      const matchesGroup = !this.selectedGroup || 
        student.groupId === this.selectedGroup;

      const matchesPaymentType = !this.selectedPaymentType || 
        student.paymentType === this.selectedPaymentType;

      return matchesSearch && matchesGroup && matchesPaymentType;
    });

    this.totalCount = this.filteredStudents.length;
    this.renderStudents();
    this.updatePagination();
  }

  renderStudents() {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return;

    const startIndex = (this.currentPage - 1) * this.studentsPerPage;
    const endIndex = startIndex + this.studentsPerPage;
    const studentsToShow = this.filteredStudents.slice(startIndex, endIndex);

    tbody.innerHTML = '';
    
    studentsToShow.forEach(student => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="d-flex px-2 py-1">
            <div class="d-flex flex-column justify-content-center">
              <h6 class="mb-0 text-sm">${student.studentName || 'غير محدد'}</h6>
              <p class="text-xs text-secondary mb-0">${student.studentCode || 'غير محدد'}</p>
            </div>
          </div>
        </td>
        <td>${student.studentPhone || 'غير محدد'}</td>
        <td>${student.groupName || 'غير محدد'}</td>
   
        <td>
          <span class="text-danger font-weight-bold">${student.amountRemaining || 0} ج.م</span>
        </td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="notificationManager.sendNotificationToStudent('${student._id}')">
            <i class="material-symbols-rounded">send</i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  updatePagination() {
    const totalPages = Math.ceil(this.totalCount / this.studentsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (pageInfo) {
      pageInfo.textContent = `صفحة ${this.currentPage} من ${totalPages} (${this.totalCount} طالب)`;
    }

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= totalPages;
    }
  }

  async sendNotificationToStudent(studentId) {
    const student = this.students.find(s => s._id === studentId);
    if (!student) return;

    // Show modal with student details
    document.getElementById('modalStudentName').textContent = student.studentName;
    document.getElementById('modalStudentCode').textContent = student.studentCode;
    document.getElementById('modalStudentPhone').textContent = student.studentPhone;
    document.getElementById('modalGroupName').textContent = student.groupName;
    document.getElementById('modalAmountRemaining').textContent = `${student.amountRemaining} ج.م`;

    // Set default message
    const defaultMessage = `مرحباً ${student.studentName}، يتبقى مبلغ ${student.amountRemaining} ج.م في المجموعة ${student.groupName}. يرجى التواصل معنا لتسديد المبلغ المتبقي.`;
    document.getElementById('notificationMessage').value = defaultMessage;

    // Show modal
    new bootstrap.Modal(document.getElementById('notificationModal')).show();
  }

  async sendNotification() {
    const message = document.getElementById('notificationMessage').value;
    const studentId = document.getElementById('modalStudentCode').textContent;

    if (!message.trim()) {
      alert('يرجى كتابة الرسالة');
      return;
    }

    try {
      const response = await fetch('/employee/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentId,
          message: message
        }),
      });

      if (response.ok) {
        alert('تم إرسال الرسالة بنجاح');
        bootstrap.Modal.getInstance(document.getElementById('notificationModal')).hide();
      } else {
        alert('حدث خطأ في إرسال الرسالة');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('حدث خطأ في الاتصال');
    }
  }

  updateMessageFromTemplate(templateType) {
    const messageInput = document.getElementById('notificationMessage');
    if (!messageInput) return;

    const template = this.templates.find(t => t.type === templateType);
    if (template) {
      messageInput.value = template.content;
    }
  }

  updateBulkFilters() {
    const groupId = document.getElementById('bulkGroupFilter').value;
    const paymentTypeFilter = document.getElementById('bulkPaymentTypeFilter');
    
    // Update payment type filter based on selected group
    if (groupId) {
      const group = this.groups.find(g => g._id === groupId);
      if (group) {
        paymentTypeFilter.value = group.paymentType;
      }
    }
    
    this.updateBulkStudentSummary();
  }

  updateBulkStudentSummary() {
    const groupId = document.getElementById('bulkGroupFilter').value;
    const paymentType = document.getElementById('bulkPaymentTypeFilter').value;
    
    let filteredStudents = this.students.filter(student => {
      const matchesGroup = !groupId || student.groupId === groupId;
      const matchesPaymentType = !paymentType || student.paymentType === paymentType;
      const hasBalance = student.amountRemaining > 0;
      
      return matchesGroup && matchesPaymentType && hasBalance;
    });
    
    const summaryElement = document.getElementById('bulkStudentSummary');
    if (summaryElement) {
      summaryElement.textContent = `سيتم إرسال الرسالة إلى ${filteredStudents.length} طالب`;
    }
  }

  async sendBulkNotifications() {
    const groupId = document.getElementById('bulkGroupFilter').value;
    const paymentType = document.getElementById('bulkPaymentTypeFilter').value;
    const message = document.getElementById('bulkBulkMessage').value;
    const templateType = document.getElementById('bulkTemplateSelect').value;

    if (!message.trim()) {
      alert('يرجى كتابة الرسالة');
      return;
    }

    // Filter students based on selected criteria
    let students = this.students.filter(student => {
      const matchesGroup = !groupId || student.groupId === groupId;
      const matchesPaymentType = !paymentType || student.paymentType === paymentType;
      const hasBalance = student.amountRemaining > 0;
      
      return matchesGroup && matchesPaymentType && hasBalance;
    });

    if (students.length === 0) {
      alert('لا يوجد طلاب يطابقون المعايير المحددة');
      return;
    }

    try {
        const response = await fetch('/employee/send-bulk-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
          students: students.map(s => s._id),
            message: message,
          templateType: templateType
          }),
        });

      if (response.ok) {
        alert(`تم إرسال الرسالة إلى ${students.length} طالب بنجاح`);
        document.getElementById('bulkBulkMessage').value = '';
        } else {
        alert('حدث خطأ في إرسال الرسائل');
      }
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      alert('حدث خطأ في الاتصال');
    }
  }

  showLoading() {
    const loadingElement = document.getElementById('loadingSpinner');
    if (loadingElement) {
      loadingElement.style.display = 'block';
    }
  }

  hideLoading() {
    const loadingElement = document.getElementById('loadingSpinner');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }

  showError(message) {
    alert(message);
  }
}

// Initialize the notification manager when the page loads
let notificationManager;
document.addEventListener('DOMContentLoaded', () => {
  notificationManager = new NotificationManager();
});