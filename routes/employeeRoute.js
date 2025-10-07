
const express = require('express');
const Employee = require('../models/employee');
const router = express.Router();
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

const employeeController = require('../controllers/employeeController.js');
const groupController = require('../controllers/groupController.js'); 


const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token;
    // console.log(token);
    if (!token) {
      return res.status(401).redirect('/');
    }
  
    try {
      const decode = jwt.verify(token, jwtSecret);
      req.employeeId = decode.employeeId;
      await Employee.findOne({ _id: decode.employeeId })
  
      .then((result) => {
          req.employee = result;
        if (result.role === 'Employee') {
          next();
        } else {
          res.clearCookie('token');
          return res.status(301).redirect('/');
        }
      });
    } catch (error) {
      return res.status(401).redirect('/');
    }
}


router.get('/dashboard', authMiddleware, employeeController.dashboard);

// Dashboard statistics
router.get('/dashboard-stats', authMiddleware, employeeController.getDashboardStats);

// Test endpoint for debugging (remove in production)
router.get('/test-dashboard-stats', employeeController.getDashboardStats);

// Test device connection
router.get('/test-device', authMiddleware, employeeController.testDevice);

// Get available devices
router.get('/devices', authMiddleware, employeeController.getDevices);

// Check device status
router.get('/device-status', authMiddleware, employeeController.checkDeviceStatus);

// Check student codes
router.get('/check-student-codes', authMiddleware, employeeController.checkStudentCodes);


// Billing routes removed

// getAllBills route removed


// ADD Student

router.get('/add-student', authMiddleware, employeeController.getAddStudent);

router.get('/all-students', authMiddleware, employeeController.getAllStudents);

router.get('/get-student/:id', authMiddleware, employeeController.getStudent);

router.put('/update-student/:id', authMiddleware, employeeController.updateStudent);

router.post('/add-student', authMiddleware, employeeController.addStudent);

router.get('/search-student', authMiddleware, employeeController.searchStudent);

router.get('/send-wa', authMiddleware, employeeController.sendWa);

router.delete('/delete-student/:id', authMiddleware, employeeController.deleteStudent);

router.post('/send-code-again/:id', authMiddleware, employeeController.sendCodeAgain);

// Student Blocking Management
router.post('/block-student/:studentId', authMiddleware, employeeController.blockStudent);
router.post('/unblock-student/:studentId', authMiddleware, employeeController.unblockStudent);

// Installment Management - Removed (no longer using selectedTeachers schema)

// Groups
router.get('/group', authMiddleware, groupController.getGroupPage);

router.get('/groups', authMiddleware, groupController.getAllGroups);

router.post('/group', authMiddleware, groupController.addGroup);

router.get('/group/:id', authMiddleware, groupController.getGroup);

router.put('/group/:id', authMiddleware, groupController.updateGroup);

router.delete('/group/:id', authMiddleware, groupController.deleteGroup);



// Attendance

router.get('/attendance', authMiddleware, employeeController.getAttendance);

router.post('/attend-student', authMiddleware, employeeController.attendStudent);

router.get('/getDeviceData', authMiddleware, employeeController.getDeviceData);

router.get('/get-attended-students', authMiddleware, employeeController.getAttendedStudents);

router.delete('/delete-attend-student/:id', authMiddleware, employeeController.deleteAttendStudent);

router.get('/download-attendance-excel', authMiddleware, employeeController.downloadAttendanceExcel);

router.put('/pay-monthly-fee/:id', authMiddleware, employeeController.payMonthlyFee);



// Invoice routes removed

// handel Attendance

router.get('/handel-attendance', authMiddleware, employeeController.handelAttendance);

router.get('/attendance-by-date', authMiddleware, employeeController.getAttendanceByDate);

router.get('/download-attendance-excel-by-date-range' , authMiddleware, employeeController.downloadAttendanceExcelByDate);


router.get('/download-sendExcelEmployeeByDate/:id', authMiddleware, employeeController.downloadAndSendExcelForEmployeeByDate);

// Student Logs
router.get('/student-logs', authMiddleware, employeeController.getStudentLogs);
router.get('/student-logs-data/:studentId', authMiddleware, employeeController.getStudentLogsData);

// Notification Management Routes
router.get('/notifications', employeeController.getNotificationsPage);
// Removed routes for functions that no longer exist (selectedTeachers schema)
router.post('/send-notification', employeeController.sendNotification);
router.post('/send-bulk-notifications', employeeController.sendBulkNotifications);
router.get('/api/notification-templates', employeeController.getNotificationTemplates);
router.post('/save-notification-template', employeeController.saveNotificationTemplate);
router.put('/update-notification-template/:templateId', employeeController.updateNotificationTemplate);
router.delete('/delete-notification-template/:templateId', employeeController.deleteNotificationTemplate);

// LogOut

router.get('/logout', authMiddleware, employeeController.logOut);

// WhatsApp connect (strict single-number)
router.get('/connect-whatsapp', authMiddleware, employeeController.connectWhatsApp_Get);
router.post('/connect-whatsapp/start', authMiddleware, employeeController.connectWhatsApp_Start);
router.get('/connect-whatsapp/qrcode', authMiddleware, employeeController.connectWhatsApp_QR);

// Device Users Management
router.get('/device-users', authMiddleware, employeeController.getDeviceUsers);
router.get('/all-device-users', authMiddleware, employeeController.getAllDeviceUsers);
router.delete('/device-users/:userId', authMiddleware, employeeController.deleteDeviceUser);
router.get('/test-listener-connection', authMiddleware, employeeController.testListenerConnection);

module.exports = router;