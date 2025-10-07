// Clean Dashboard JavaScript - Professional Design

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

// Show error message
function showErrorMessage(message) {
  // Create a simple toast notification
  const toast = document.createElement('div');
  toast.className = 'alert alert-danger alert-dismissible fade show position-fixed';
  toast.style.cssText = 'top: 20px; right: 20px; z-index: 10000; min-width: 300px;';
  toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 5000);
}

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    showLoading();
    console.log('🔄 Loading dashboard statistics...');
    
    // Fetch dashboard data
    const response = await fetch('/employee/dashboard-stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin' // Include cookies for authentication
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Received data:', data);
    
    if (data.success) {
      // Update statistics with proper formatting
      const totalStudentsEl = document.getElementById('totalStudents');
      const todayAttendanceEl = document.getElementById('todayAttendance');
      const totalRevenueEl = document.getElementById('totalRevenue');
      const attendanceRateEl = document.getElementById('attendanceRate');
      
      if (totalStudentsEl) {
        totalStudentsEl.textContent = data.totalStudents || 0;
        console.log('✅ Updated total students:', data.totalStudents);
      } else {
        console.warn('⚠️ totalStudents element not found');
      }
      
      if (todayAttendanceEl) {
        todayAttendanceEl.textContent = data.todayAttendance || 0;
        console.log('✅ Updated today attendance:', data.todayAttendance);
      } else {
        console.warn('⚠️ todayAttendance element not found');
      }
      
      if (totalRevenueEl) {
        totalRevenueEl.textContent = (data.totalRevenue || 0) + ' EGP';
        console.log('✅ Updated total revenue:', data.totalRevenue);
      } else {
        console.log('ℹ️ totalRevenue element not found (commented out)');
      }
      
      if (attendanceRateEl) {
        attendanceRateEl.textContent = (data.attendanceRate || 0) + '%';
        console.log('✅ Updated attendance rate:', data.attendanceRate);
      } else {
        console.warn('⚠️ attendanceRate element not found');
      }
      
      // Update recent activity
      updateRecentActivity(data.recentActivity || []);
      
      console.log('✅ Dashboard stats loaded successfully');
    } else {
      console.error('❌ API returned error:', data.message || 'Unknown error');
      showErrorMessage(data.message || 'فشل في تحميل إحصائيات لوحة التحكم');
    }
  } catch (error) {
    console.error('❌ Error loading dashboard stats:', error);
    showErrorMessage(`حدث خطأ في تحميل البيانات: ${error.message}`);
  } finally {
    hideLoading();
  }
}

// Update recent activity table
function updateRecentActivity(activities) {
  const tableBody = document.getElementById('recentActivityTable');
  if (!tableBody) return;
  
  if (activities.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">لا توجد أنشطة حديثة اليوم</td></tr>';
    return;
  }
  
  tableBody.innerHTML = '';
  
  activities.forEach(activity => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${activity.studentName || 'غير محدد'}</td>
      <td>${activity.groupName || 'غير محدد'}</td>
      <td>${activity.time || 'غير محدد'}</td>
      <td>${activity.amount || 0} EGP</td>
      <td>
        <span class="badge bg-success">تم الحضور</span>
      </td>
    `;
    tableBody.appendChild(row);
  });
  
  console.log(`Updated recent activity with ${activities.length} records`);
}

// Add refresh functionality
function refreshDashboard() {
  console.log('Refreshing dashboard...');
  loadDashboardStats();
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard page loaded, initializing...');
  
  // Check if we're on the dashboard page
  const isDashboardPage = window.location.pathname.includes('/dashboard');
  if (!isDashboardPage) {
    console.log('Not on dashboard page, skipping initialization');
    return;
  }
  
  // Verify required elements exist
  const requiredElements = ['totalStudents', 'todayAttendance', 'attendanceRate', 'recentActivityTable'];
  const missingElements = requiredElements.filter(id => !document.getElementById(id));
  
  if (missingElements.length > 0) {
    console.error('❌ Missing required dashboard elements:', missingElements);
    showErrorMessage('خطأ في تحميل عناصر لوحة التحكم');
    return;
  }
  
  // Load initial stats
  loadDashboardStats();
  
  // Add refresh button functionality if it exists
  const refreshBtn = document.getElementById('refreshDashboard');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshDashboard);
    console.log('✅ Refresh button initialized');
  } else {
    console.warn('⚠️ Refresh button not found');
  }
  
  // Refresh stats every 5 minutes
  setInterval(loadDashboardStats, 5 * 60 * 1000);
  
  console.log('✅ Dashboard initialized successfully');
});

// Make refresh function globally available
window.refreshDashboard = refreshDashboard;

console.log('Dashboard JavaScript loaded - Professional design with real data');