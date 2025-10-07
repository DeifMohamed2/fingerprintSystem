const Employee = require('../models/employee');
// Billing model removed
const Group = require('../models/group');
const Student = require('../models/student');
const Attendance = require('../models/attendance');
const qrcode = require('qrcode');
const ExcelJS = require('exceljs');

const waService = require('../utils/waService');
const { StudentCodeUtils } = require('../utils/waziper');
const axios = require('axios');

// Device API configuration
const DEVICE_API_BASE = 'http://127.0.0.1:5001/api';

// Helper function to add user to specific fingerprint device
const addUserToDevice = async (userId, userName, deviceId = null) => {
  try {
    console.log(
      `🔧 Adding user to device: ${userId} - ${userName}${
        deviceId ? ` (Device: ${deviceId})` : ' (Default device)'
      }`
    );

    let endpoint = `${DEVICE_API_BASE}/users`;
    let payload = {
      userId: userId,
      name: userName,
      privilege: 0, // Default privilege
      password: '',
      enabled: true,
    };

    // If deviceId is specified, we need to add the user to that specific device
    if (deviceId && deviceId.trim() !== '') {
      console.log(`🎯 Targeting specific device: ${deviceId}`);
      payload.deviceId = String(deviceId).trim();
    } else {
      console.log(`🏠 Using default device (first enabled device)`);
    }

    console.log(
      `📤 Sending payload to device API:`,
      JSON.stringify(payload, null, 2)
    );

    const response = await axios.post(endpoint, payload, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Device response:', response.data);

    if (response.data && response.data.ok) {
      return { success: true, data: response.data };
    } else {
      return {
        success: false,
        error: 'Device returned error: ' + JSON.stringify(response.data),
      };
    }
  } catch (error) {
    console.error('❌ Error adding user to device:', error.message);
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Cannot connect to fingerprint device service on port 5001.',
      };
    } else if (error.response) {
      return {
        success: false,
        error: `Device error: ${error.response.status} - ${
          error.response.data?.error || error.response.statusText
        }`,
      };
    } else {
      return { success: false, error: error.message };
    }
  }
};

// Helper function to get available devices
const getAvailableDevices = async () => {
  try {
    console.log('🔍 Fetching available devices...');
    const response = await axios.get(`${DEVICE_API_BASE}/devices`, {
      timeout: 5000,
    });

    if (response.data && response.data.ok) {
      console.log('✅ Devices fetched successfully:', response.data.data);
      return { success: true, data: response.data.data };
    } else {
      return {
        success: false,
        error: 'Device returned error: ' + JSON.stringify(response.data),
      };
    }
  } catch (error) {
    console.error('❌ Failed to fetch devices:', error.message);
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error:
          'Cannot connect to fingerprint device. Please check if the device is running on port 5001.',
      };
    } else {
      return { success: false, error: error.message };
    }
  }
};

// Helper function to test device connection
const testDeviceConnection = async () => {
  try {
    console.log('🔍 Testing device connection...');
    // Use /devices to verify listener is up and devices are reachable
    const response = await axios.get(`${DEVICE_API_BASE}/devices`, {
      timeout: 5000,
    });
    if (response.data && response.data.ok) {
      const devices = response.data.data || [];
      console.log(
        '✅ Devices endpoint reachable. Devices count:',
        devices.length
      );
      return { success: true, data: { devices } };
    }
    return {
      success: false,
      error: 'Device returned error: ' + JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('❌ Device connection test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Cannot connect to fingerprint device service on port 5001.',
      };
    } else if (error.response) {
      return { success: false, error: `HTTP ${error.response.status}` };
    } else {
      return { success: false, error: error.message };
    }
  }
};

// Helper function to delete user from fingerprint device
const deleteUserFromDevice = async (userId) => {
  try {
    const response = await axios.delete(`${DEVICE_API_BASE}/users/${userId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error deleting user from device:', error.message);
    return { success: false, error: error.message };
  }
};

// Check student codes in database
const checkStudentCodes = async (req, res) => {
  try {
    const students = await Student.find(
      {},
      'studentCode studentName studentPhoneNumber'
    ).limit(20);
    const studentData = students.map((s) => ({
      id: s._id,
      code: s.studentCode,
      name: s.studentName,
      phone: s.studentPhoneNumber,
    }));

    res.json({
      success: true,
      message: 'Student codes retrieved',
      students: studentData,
      total: students.length,
    });
  } catch (error) {
    console.error('Error checking student codes:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving student codes',
      error: error.message,
    });
  }
};

// Test device connection endpoint
const testDevice = async (req, res) => {
  try {
    const result = await testDeviceConnection();
    if (result.success) {
      res.json({
        success: true,
        message: 'Device connected successfully',
        deviceInfo: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Device connection failed',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error testing device:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing device connection',
      error: error.message,
    });
  }
};

// Get available devices endpoint
const getDevices = async (req, res) => {
  try {
    const result = await getAvailableDevices();
    if (result.success) {
      res.json({
        success: true,
        message: 'Devices fetched successfully',
        devices: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch devices',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching devices',
      error: error.message,
    });
  }
};

const dashboard = (req, res) => {
  res.render('employee/dashboard', {
    title: 'Dashboard',
    path: '/employee/dashboard',
    employeeData: req.employee,
  });
};

// Dashboard statistics endpoint
const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Dashboard stats requested by:', req.employee?.employeeName || 'Unknown');
    
    const today = getDateTime();
    console.log('📅 Today date:', today);
    
    // Get total students count
    const totalStudents = await Student.countDocuments({});
    console.log('👥 Total students:', totalStudents);
    
    // Get total groups count
    const totalGroups = await Group.countDocuments({ isActive: true });
    console.log('👥 Total groups:', totalGroups);
    
    // Get today's attendance count across all groups
    const todayAttendance = await Attendance.aggregate([
      {
        $match: {
          date: today
        }
      },
      {
        $group: {
          _id: null,
          totalAttendance: { $sum: { $size: "$studentsPresent" } }
        }
      }
    ]);
    
    const todayAttendanceCount = todayAttendance.length > 0 ? todayAttendance[0].totalAttendance : 0;
    console.log('📈 Today attendance count:', todayAttendanceCount);
    
    // Calculate total revenue (assuming each attendance is worth a fixed amount)
    // You can modify this based on your business logic
    const totalRevenue = todayAttendanceCount * 50; // Assuming 50 EGP per attendance
    
    // Calculate attendance rate (students who attended today vs total students)
    const attendanceRate = totalStudents > 0 ? Math.round((todayAttendanceCount / totalStudents) * 100) : 0;
    
    // Get recent activity (last 10 attendance records)
    const recentActivity = await Attendance.find({
      date: today
    })
    .populate('studentsPresent.student', 'studentName studentCode')
    .populate('group', 'groupName')
    .populate('studentsPresent.addedBy', 'employeeName')
    .sort({ updatedAt: -1 })
    .limit(10);
    
    console.log('📋 Recent activity records found:', recentActivity.length);
    
    // Format recent activity data
    const formattedRecentActivity = [];
    recentActivity.forEach(attendance => {
      attendance.studentsPresent.forEach(studentPresent => {
        if (studentPresent.student) {
          formattedRecentActivity.push({
            studentName: studentPresent.student.studentName,
            groupName: attendance.group ? attendance.group.groupName : 'غير محدد',
            time: new Date(studentPresent.createdAt || attendance.updatedAt).toLocaleTimeString('ar-EG', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            amount: 50, // Fixed amount per attendance
            addedBy: studentPresent.addedBy ? studentPresent.addedBy.employeeName : 'غير محدد'
          });
        }
      });
    });
    
    // Sort by time (most recent first) and limit to 10
    formattedRecentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedRecentActivity = formattedRecentActivity.slice(0, 10);
    
    const responseData = {
      success: true,
      totalStudents,
      totalGroups,
      todayAttendance: todayAttendanceCount,
      totalRevenue,
      attendanceRate,
      recentActivity: limitedRecentActivity,
      debug: {
        today,
        totalStudents,
        totalGroups,
        todayAttendanceCount,
        recentActivityCount: recentActivity.length
      }
    };
    
    console.log('✅ Dashboard stats response:', responseData);
    
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب إحصائيات لوحة التحكم',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Teacher schedule function removed - no longer needed

// Billing functionality removed

// ======================================== Add Student ======================================== //

const getAddStudent = async (req, res) => {
  try {
    // First, get all groups
    const allGroups = await Group.find(
      { isActive: true },
      {
        groupName: 1,
        students: 1,
      }
    );

    // Get available devices
    const devicesResult = await getAvailableDevices();
    const availableDevices = devicesResult.success ? devicesResult.data : [];

    res.render('employee/addStudent', {
      title: 'Add Student',
      path: '/employee/add-student',
      allGroups,
      availableDevices,
    });
  } catch (error) {
    console.error('Error loading add student page:', error);
    res.status(500).send('Error loading add student page');
  }
};

const getAllStudents = async (req, res) => {
  try {
    const allStudents = await Student.find()
      .populate({ path: 'groups', select: 'groupName' })
      .populate('monthlyPaymentPaidBy', 'employeeName')
      .sort({ createdAt: -1 });
    
    // Add last payment date to each student and fix payment status
    const studentsWithLastPayment = allStudents.map(student => {
      const history = Array.isArray(student.monthlyPaymentHistory)
        ? student.monthlyPaymentHistory
        : [];
      
      // Determine if student has paid (either through monthlyPaymentPaid or has history)
      const hasPaid = student.monthlyPaymentPaid || history.length > 0;
      
      // Get last payment from history or from monthlyPaymentDate
      const lastPayment = history.length > 0
        ? history[history.length - 1]
        : student.monthlyPaymentPaid && student.monthlyPaymentDate
        ? { 
            date: student.monthlyPaymentDate, 
            paidBy: student.monthlyPaymentPaidBy 
          }
        : null;
      
      return {
        ...student.toObject(),
        monthlyPaymentPaid: hasPaid, // Use calculated value
        lastPaymentDate: lastPayment ? lastPayment.date : null,
        lastPaymentBy: lastPayment ? lastPayment.paidBy : null
      };
    });
    
    res.json(studentsWithLastPayment);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students' });
  }
};

const getStudent = async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('groups');
  console.log(student);
  res.send(student);
};

async function sendQRCode(chatId, message, studentCode) {
  try {
    const phone = String(chatId || '').replace(
      /@c\.us$|@s\.whatsapp\.net$/i,
      ''
    );
    const resp = await waService.sendQRMessage(
      studentCode,
      phone,
      waService.DEFAULT_ADMIN_PHONE,
      '20',
      message
    );
    if (!resp.success) {
      console.error('Error sending QR code:', resp.message);
    }
  } catch (error) {
    console.error('Error sending QR code:', error);
  }
}

const addStudent = async (req, res) => {
  const {
    studentName,
    studentPhoneNumber,
    studentParentPhone,
    groups,
    schoolName,
    deviceId,
  } = req.body;

  // Debug: Log the received data
  console.log('Received data:', {
    studentName,
    studentPhoneNumber,
    studentParentPhone,
    groups,
    schoolName,
    deviceId
  });

  if (studentName.length < 3) {
    res.status(400).send({ message: 'اسم الطالب لازم يكون اكتر من 3 احرف' });
    return;
  }

  if (studentPhoneNumber.length !== 11) {
    res.status(400).send({ message: 'رقم الهاتف يجب ان يكون مكون من 11 رقم' });
    return;
  }

  if (studentParentPhone.length !== 11) {
    res
      .status(400)
      .send({ message: 'رقم هاتف ولى الامر يجب ان يكون مكون من 11 رقم' });
    return;
  }

  // Check for duplicate phone numbers
  const existingStudentByPhone = await Student.findOne({ studentPhoneNumber });
  if (existingStudentByPhone) {
    res.status(400).send({ message: 'رقم هاتف الطالب موجود بالفعل' });
    return;
  }

  // Handle multiple groups - students must be enrolled in at least one group
  let selectedGroups = [];
  
  if (groups) {
    if (typeof groups === 'string') {
      try {
        selectedGroups = JSON.parse(groups);
      } catch (e) {
        selectedGroups = [groups];
      }
    } else if (Array.isArray(groups)) {
      selectedGroups = groups;
    }
    selectedGroups = selectedGroups.filter(Boolean); // Remove any empty values
  }

  // Debug: Log processed groups
  console.log('Processed groups:', selectedGroups);

  if (selectedGroups.length === 0) {
    res.status(400).send({ message: 'يجب اختيار مجموعة واحدة على الأقل' });
    return;
  }

  // School name is optional, set default if empty
  const finalSchoolName = schoolName || 'غير محدد';


  try {
    // Validate all selected groups
    const groupsData = await Group.find({ _id: { $in: selectedGroups } });
    if (groupsData.length !== selectedGroups.length) {
      res.status(404).send({ message: 'بعض المجموعات المختارة غير موجودة' });
      return;
    }


    // Generate a unique student code using the utility function
    const studentCode = Math.floor(1000 + Math.random() * 9000);

    const student = new Student({
      studentName,
      studentPhoneNumber,
      studentParentPhone,
      schoolName: finalSchoolName,
      groups: selectedGroups, // All selected groups
      studentCode: studentCode,
      monthlyPaymentPaid: false,
      monthlyPaymentDate: null,
      monthlyPaymentPaidBy: null,
    });

    student
      .save()
      .then(async (result) => {
        // Update all selected groups current students count
        await Group.updateMany(
          { _id: { $in: selectedGroups } },
          {
            $inc: { currentStudents: 1 },
            $push: { students: student._id },
          }
        );

        // Test device connection first
        console.log('🔍 Testing device connection before adding user...');
        const deviceTest = await testDeviceConnection();

        let deviceResult;
        if (deviceTest.success) {
          console.log('✅ Device connected, adding user...');
          // Add student to fingerprint device (with deviceId if specified)
          deviceResult = await addUserToDevice(
            studentCode,
            studentName,
            deviceId
          );
        } else {
          console.log('❌ Device not connected, skipping user addition');
          deviceResult = {
            success: false,
            error: `Device connection failed: ${deviceTest.error}`,
          };
        }

        // Return student data with device status
        const populated = await Student.findById(student._id)
          .populate('groups', 'groupName');
        res.send({
          ...populated.toObject(),
          deviceStatus: deviceResult,
          studentCode: populated.studentCode,
          studentName: populated.studentName,
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({ message: 'خطأ في حفظ بيانات الطالب' });
      });
  } catch (error) {
    console.error('Error in addStudent:', error);
    res.status(500).send({ message: 'خطأ في إضافة الطالب' });
  }
};

const updateStudent = async (req, res) => {
  const {
    studentName,
    studentPhoneNumber,
    studentParentPhone,
    schoolName,
    monthlyPaymentPaid,
    groups,
  } = req.body;

  if (studentName.length < 3) {
    res.status(400).send({ message: 'اسم الطالب لازم يكون اكتر من 3 احرف' });
    return;
  }

  if (studentPhoneNumber.length !== 11) {
    res.status(400).send({ message: 'رقم الهاتف يجب ان يكون مكون من 11 رقم' });
    return;
  }

  if (studentParentPhone.length !== 11) {
    res
      .status(400)
      .send({ message: 'رقم هاتف ولى الامر يجب ان يكون مكون من 11 رقم' });
    return;
  }

  try {
    // Check for duplicate phone numbers (excluding current student)
    const existingStudentByPhone = await Student.findOne({
      studentPhoneNumber,
      _id: { $ne: req.params.id },
    });
    if (existingStudentByPhone) {
      return res.status(400).send({ message: 'رقم هاتف الطالب موجود بالفعل' });
    }

    // Update student data
    const updateData = {
      studentName,
      studentPhoneNumber,
      studentParentPhone,
      schoolName: schoolName || 'غير محدد',
      monthlyPaymentPaid: monthlyPaymentPaid || false,
    };

    // If monthly payment is being set to true, update the date and employee
    if (monthlyPaymentPaid) {
      updateData.monthlyPaymentDate = new Date();
      updateData.monthlyPaymentPaidBy = req.employeeId;
    }

    // Fetch current student to handle group changes
    const current = await Student.findById(req.params.id);
    if (!current) {
      return res.status(404).send({ message: 'الطالب غير موجود' });
    }

    // Handle group changes
    let newGroups = Array.isArray(groups) ? groups.filter(Boolean) : undefined;
    if (typeof groups === 'string') {
      try {
        newGroups = JSON.parse(groups);
      } catch (e) {
        newGroups = [groups];
      }
    }
    if (newGroups && newGroups.length > 0) {
      updateData.groups = newGroups;
    }

    // Apply update
    const student = await Student.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).populate('groups', 'groupName');

    if (!student) {
      return res.status(404).send({ message: 'الطالب غير موجود' });
    }

    // Sync membership in groups list with proper count updates
    if (newGroups) {
      const prevGroups = (current.groups || []).map(String);
      const nextGroups = newGroups.map(String);
      const toAdd = nextGroups.filter((g) => !prevGroups.includes(g));
      const toRemove = prevGroups.filter((g) => !nextGroups.includes(g));
      
      // Add to new groups with count increment
      if (toAdd.length) {
        await Group.updateMany(
          { _id: { $in: toAdd } },
          { 
            $inc: { currentStudents: 1 },
            $addToSet: { students: student._id } 
          }
        );
      }
      
      // Remove from old groups with count decrement
      if (toRemove.length) {
        await Group.updateMany(
          { _id: { $in: toRemove } },
          { 
            $inc: { currentStudents: -1 },
            $pull: { students: student._id } 
          }
        );
      }
    }

    res.status(200).send({
      success: true,
      message: 'تم تحديث بيانات الطالب بنجاح',
      student,
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).send({ message: 'حدث خطأ في تحديث بيانات الطالب' });
  }
};

const searchStudent = async (req, res) => {
  try {
    const { searchStudent } = req.query;
    console.log('Search term:', searchStudent);

    if (!searchStudent) {
      return res.status(400).json({ message: 'Search term is required' });
    }

    const searchTerm = searchStudent.trim();
    let query = {};

    // Check if search contains only numbers
    const isOnlyNumbers = /^\d+$/.test(searchTerm);

    if (isOnlyNumbers) {
      // If it's only numbers, search by studentCode, phone number
      query.$or = [
        { studentCode: searchTerm },
        { studentPhoneNumber: searchTerm },
      ];
    } else {
      // If it contains text, search by name
      query.studentName = { $regex: searchTerm, $options: 'i' };
    }

    console.log('Query:', query);
    
    // Fetch the student records with group info
    const students = await Student.find(query)
      .populate('groups', 'groupName')
      .populate('monthlyPaymentPaidBy', 'employeeName');

    console.log('Students found:', students.length);

    // Return the first student found (for student logs) with corrected payment status
    if (students.length > 0) {
      const student = students[0];
      const history = Array.isArray(student.monthlyPaymentHistory)
        ? student.monthlyPaymentHistory
        : [];
      
      // Determine if student has paid (either through monthlyPaymentPaid or has history)
      const hasPaid = student.monthlyPaymentPaid || history.length > 0;
      
      // Get last payment from history or from monthlyPaymentDate
      const lastPayment = history.length > 0
        ? history[history.length - 1]
        : student.monthlyPaymentPaid && student.monthlyPaymentDate
        ? { 
            date: student.monthlyPaymentDate, 
            paidBy: student.monthlyPaymentPaidBy 
          }
        : null;
      
      const correctedStudent = {
        ...student.toObject(),
        monthlyPaymentPaid: hasPaid,
        lastMonthlyPayment: lastPayment,
        group: student.groups && student.groups.length > 0 ? student.groups[0] : null // Add group field for compatibility
      };
      
      res.status(200).json({ student: correctedStudent });
    } else {
      res.status(404).json({ message: 'No students found' });
    }
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'An error occurred while searching for students' });
  }
};

const sendWa = async (req, res) => {
  const { teacher, message } = req.query;
  try {
    const students = await Student.find({ studentTeacher: teacher }).populate(
      'studentTeacher',
      'teacherName subjectName'
    );

    for (const student of students) {
      const waPhone = student.studentParentPhone;

      const messageUpdate = `
عزيزي ولي امر الطالب ${student.studentName}
هذه الرساله من كورس ${
        student.studentTeacher.subjectName
      } بتاريخ ${new Date().toLocaleDateString()}
والذي يقوم بتدريسه المدرس ${student.studentTeacher.teacherName}
${message}
--------------------------
ويرجي العلم انهو تم سداد حتي الان ${
        student.studentAmount - student.amountRemaining
      } من اجمالي المبلغ
والباقي ${student.amountRemaining} جنيه
تحياتنا
`;

      try {
        const resp = await waService.sendWasenderMessage(
          messageUpdate,
          waPhone,
          waService.DEFAULT_ADMIN_PHONE
        );
        if (!resp.success)
          console.error('Error sending message:', resp.message);
      } catch (error) {
        console.error('Error sending message:', error);
      }

      // Random delay between 1 to 3 seconds between each message
      const delay = Math.floor(Math.random() * 3000) + 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    res.status(200).send({ message: 'Messages sent successfully' });
  } catch (error) {
    console.error('Error sending messages:', error);
    res.status(500).send({ error: 'An error occurred while sending messages' });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    // Remove from all groups
    if (Array.isArray(student.groups) && student.groups.length > 0) {
      await Group.updateMany(
        { _id: { $in: student.groups } },
        { 
          $inc: { currentStudents: -1 },
          $pull: { students: student._id } 
        }
      );
    }
    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while deleting student' });
  }
};

const sendCodeAgain = async (req, res) => {
  const { id } = req.params;
  try {
    const student = await Student.findById(id)
      .populate('groups', 'groupName');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    let message = `📌 *تفاصيل تسجيل الطالب*\n\n`;
    message += `👤 *اسم الطالب:* ${student.studentName}\n`;
    message += `🏫 *المدرسة:* ${student.schoolName}\n`;
    message += `📞 *رقم الهاتف:* ${student.studentPhoneNumber}\n`;
    message += `📞 *رقم ولي الأمر:* ${student.studentParentPhone}\n`;
    message += `🆔 *كود الطالب:* ${student.studentCode}\n`;
    message += `👥 *المجموعة:* ${student.groups && student.groups.length > 0 ? student.groups[0].groupName : 'غير محدد'}\n\n`;

    // Send the message via WhatsApp or another service
    sendQRCode(
      student.studentPhoneNumber,
      `Scan the QR code to check in\n\n${message}`,
      student.studentCode
    );

    res.status(200).json({ message: 'QR code sent successfully' });
  } catch (error) {
    console.error('Error sending QR code:', error);
    res.status(500).json({ message: 'An error occurred while sending QR code' });
  }
};

// Installment functionality removed - no longer using selectedTeachers schema

// Installment history functionality removed - no longer using selectedTeachers schema

// Course details functionality removed - no longer using selectedTeachers schema

// ======================================== End Add Student ======================================== //

// ================================= Teacher ================================ //

// Teacher functions removed - no longer needed

// Teacher functions removed - no longer needed

// Teacher functions removed - no longer needed

// Teacher functions removed - no longer needed

// Teacher functions removed - no longer needed

// ======================================== End Teacher ======================================== //

// ======================================== Attendance ======================================== //

const getAttendance = async (req, res) => {
  const employee = req.employee;
  console.log(employee.device);
  const allGroups = await Group.find({ isActive: true });
  res.render('employee/attendance', {
    title: 'Attendance',
    path: '/employee/attendance',
    allGroups: allGroups,
    device: employee.device,
  });
};

const getDeviceData = async (req, res) => {
  const employee = req.employee;
  res.send({ device: employee.device });
};

function getDateTime() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', // Egypt's time zone
  }).format(new Date());
  return today;
}

const attendStudent = async (req, res) => {
  console.time('attendStudentExecutionTime');

  const { searchStudent, groupId } = req.body;
  const employeeId = req.employeeId;

  // Debug the incoming values
  console.log('Request body:', {
    searchStudent,
    groupId,
  });

  if (!groupId) {
    return res.status(400).json({ message: 'يجب اختيار المجموعة' });
  }

  try {
    // Find the student
    let studentQuery;
    const SearchStudent = searchStudent.trim();

    // Check if search contains only numbers
    const isOnlyNumbers = /^\d+$/.test(SearchStudent);

    if (isOnlyNumbers) {
      // If it's only numbers, search by barCode, studentCode, and phone number
      studentQuery = {
        $or: [
          { barCode: SearchStudent },
          { studentCode: SearchStudent }, // Now using pure numeric codes
          { studentPhoneNumber: SearchStudent },
        ],
      };
    } else {
      // If it contains text, search by name or other text fields
      studentQuery = {
        $or: [
          { barCode: SearchStudent },
          { studentCode: SearchStudent },
          { studentName: { $regex: SearchStudent, $options: 'i' } },
        ],
      };
    }

    // Debug: Log the search query
    console.log(
      '🔍 Searching for student with query:',
      JSON.stringify(studentQuery)
    );

    const student = await Student.findOne(studentQuery).populate(
      'groups',
      'groupName'
    );

    if (!student) {
      console.log('❌ Student not found with search term:', SearchStudent);
      // Let's also check what students exist in the database
      const allStudents = await Student.find(
        {},
        'studentCode studentName studentPhoneNumber'
      ).limit(5);
      console.log(
        '📋 Sample students in database:',
        allStudents.map((s) => ({
          code: s.studentCode,
          name: s.studentName,
          phone: s.studentPhoneNumber,
        }))
      );
      return res.status(404).json({ message: 'هذا الطالب غير موجود' });
    }

    console.log('✅ Student found:', {
      name: student.studentName,
      code: student.studentCode,
      phone: student.studentPhoneNumber,
      groups: student.groups.map(g => ({ id: g._id, name: g.groupName }))
    });

    // Check if student is blocked first
    if (student.isBlocked) {
      return res.status(403).json({
        message: 'هذا الطالب محظور من المركز',
        blockReason: student.blockReason,
        blockedAt: student.blockedAt,
      });
    }

    // Check if student is enrolled in the selected group
    console.log('🔍 Checking group enrollment:', {
      selectedGroupId: groupId,
      studentGroups: student.groups.map(g => ({ id: g._id || g, name: g.groupName }))
    });
    
    const isEnrolledInGroup = student.groups.some(group => 
      group._id.toString() === groupId || group.toString() === groupId
    );
    
    console.log('✅ Is enrolled in group:', isEnrolledInGroup);
    
    if (!isEnrolledInGroup) {
      console.log('❌ Student not enrolled in selected group:', groupId);
      console.log('Student groups:', student.groups.map(g => ({ id: g._id || g, name: g.groupName })));
      return res.status(403).json({ 
        message: 'هذا الطالب غير مسجل في المجموعة المختارة',
        studentGroups: student.groups.map(g => g.groupName || g)
      });
    }

    // Fetch the group's details
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'المجموعة غير موجودة' });
    }

    // Find or create today's attendance record for this group
    const todayDate = getDateTime();
    let attendance = await Attendance.findOne({
      date: todayDate,
      group: groupId,
    });

    if (!attendance) {
      attendance = new Attendance({
        date: todayDate,
        group: groupId,
        studentsPresent: [],
      });
    }

    // Check if the student is already marked present
    const isStudentPresent = attendance.studentsPresent.some(
      (entry) => entry.student.toString() === student._id.toString()
    );

    if (isStudentPresent) {
      return res
        .status(400)
        .json({ message: 'تم تسجيل حضور الطالب بالفعل لهذه المجموعة' });
    }

    // Calculate the number of times the student has attended the same group
    const attendanceCount = await Attendance.countDocuments({
      'studentsPresent.student': student._id,
      group: groupId,
    });

    console.log('Attendance Count:', attendanceCount);

    // Add the student to the attendance record
    attendance.studentsPresent.push({
      student: student._id,
      addedBy: employeeId,
    });

    // Save the attendance record
    await attendance.save();

    // Send message to parent in Arabic
    const parentMessage = `
عزيزي ولي أمر الطالب ${student.studentName},
-----------------------------
نود إعلامكم بأن الطالب قد تم تسجيل حضوره اليوم .
المجموعة: ${group.groupName}
التاريخ: ${new Date().toLocaleDateString()}
شكرًا لتعاونكم.
`;

    try {
      const resp = await waService.sendWasenderMessage(
        parentMessage,
        student.studentParentPhone,
        waService.DEFAULT_ADMIN_PHONE
      );
      if (!resp.success) console.error('Error sending message:', resp.message);
    } catch (error) {
      console.error('Error sending message:', error);
      // Continue with the process even if message sending fails
    }

    // Populate updated attendance data
    const updatedAttendance = await Attendance.findById(attendance._id)
      .populate({
        path: 'studentsPresent.student',
      })
      .populate('studentsPresent.addedBy', 'employeeName');

    console.log(student);
    res.status(201).json({
      message: 'تم تسجيل الحضور',
      studentData: {
        studentName: student.studentName,
        studentCode: student.studentCode,
        monthlyPaymentPaid: student.monthlyPaymentPaid,
        studentTeacher: {
          teacherName: group.groupName,
          subjectName: group.groupName,
        },
        attendanceCount: attendanceCount + 1,
      },
      students: updatedAttendance.studentsPresent,
    });
  } catch (error) {
    console.error('Error attending student:', error);
    res.status(500).json({ message: 'يبدو ان هناك مشكله ما حاول مره اخري' });
  }
};

const getAttendedStudents = async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required' });
    }
    console.log('📊 Fetching attendance for group:', groupId, 'on date:', getDateTime());
    // Fetch attendance record for today
    const attendance = await Attendance.findOne({
      date: getDateTime(),
      group: groupId,
    })
      .populate({
        path: 'studentsPresent.student',
      })
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate('group', 'groupName');

    if (!attendance) {
      console.log('❌ No attendance found for group:', groupId, 'on date:', getDateTime());
      return res.status(404).json({ message: 'لا يوجد حضور اليوم' });
    }
    
    console.log('✅ Attendance found with', attendance.studentsPresent.length, 'students');

    // Filter out null students (to prevent errors in calculations)
    const filteredStudents = attendance.studentsPresent.filter(
      (sp) => sp.student
    );

    // Calculate attendance count for each student
    const studentAttendanceCounts = await Promise.all(
      filteredStudents.map(async ({ student }) => {
        const attendanceCount = await Attendance.countDocuments({
          'studentsPresent.student': student._id,
          group: groupId,
          createdAt: { $gte: new Date('2025-04-20T00:00:00.000Z') },
        });
        return { studentId: student._id, attendanceCount };
      })
    );

    // Add attendance count to each student
    const studentsWithAttendanceCount = filteredStudents.map((student) => {
      const attendanceCount =
        studentAttendanceCounts.find(
          (count) =>
            count.studentId.toString() === student.student._id.toString()
        )?.attendanceCount || 0;
      return { ...student.toObject(), attendanceCount };
    });

    res.status(200).json({
      students: studentsWithAttendanceCount,
      message: 'حضور المجموعة المحددة',
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'يبدو ان هناك مشكله ما حاول مره اخري' });
  }
};

const payMonthlyFee = async (req, res) => {
  const { id } = req.params;
  const employeeId = req.employeeId;

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'الطالب غير موجود' });
    }

    // Update monthly payment status
    student.monthlyPaymentPaid = true;
    student.monthlyPaymentDate = new Date();
    student.monthlyPaymentPaidBy = employeeId;

    // Append to monthly payment history for audit/logs
    if (!Array.isArray(student.monthlyPaymentHistory)) student.monthlyPaymentHistory = [];
    student.monthlyPaymentHistory.push({
      date: student.monthlyPaymentDate,
      paidBy: employeeId,
    });

    await student.save();

    res.status(200).json({
      message: `تم تسجيل دفع الرسوم الشهرية للطالب ${student.studentName}`,
      lastPaymentDate: student.monthlyPaymentDate,
    });
  } catch (error) {
    console.error('Error paying monthly fee:', error);
    res.status(500).json({ message: 'حدث خطأ في تسجيل الدفع الشهري' });
  }
};

// Function to reset monthly payments (call this on the first day of each month)
const resetMonthlyPayments = async () => {
  try {
    const result = await Student.updateMany(
      {},
      {
        $set: {
          monthlyPaymentPaid: false,
          monthlyPaymentDate: null,
          monthlyPaymentPaidBy: null,
        },
      }
    );
    console.log(`Reset monthly payments for ${result.modifiedCount} students`);
    return result;
  } catch (error) {
    console.error('Error resetting monthly payments:', error);
    throw error;
  }
};

const deleteAttendStudent = async (req, res) => {
  const { id } = req.params;
  const { groupId } = req.query;
  try {
    console.log('Deleting student:', id, 'Group:', groupId);

    // Find the attendance record for today and the student being removed
    const attendance = await Attendance.findOne(
      {
        date: getDateTime(),
        group: groupId,
        'studentsPresent.student': id,
      },
      { 'studentsPresent.$': 1 } // Fetch only the matching student
    );
    console.log('Attendance:', attendance);
    if (!attendance || !attendance.studentsPresent.length) {
      return res
        .status(404)
        .json({ message: 'Student not found in attendance' });
    }

    // Remove student from attendance
    const updateResult = await Attendance.updateOne(
      { date: getDateTime(), group: groupId },
      {
        $pull: { studentsPresent: { student: id } },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({ message: 'Failed to remove student' });
    }

    res.status(200).json({
      message: 'Student removed from attendance',
    });
  } catch (error) {
    console.error('Error deleting student from attendance:', error);
    res.status(500).json({
      message: 'An error occurred while deleting the student from attendance',
    });
  }
};

const downloadAttendanceExcel = async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required' });
    }

    // Fetch today's attendance for the specific group
    const attendance = await Attendance.findOne({
      date: getDateTime(),
      group: groupId,
    })
      .populate('studentsPresent.student')
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate('group', 'groupName groupFees paymentType');

    if (!attendance) {
      return res
        .status(404)
        .json({ message: 'No attendance record found for this group' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define styles
    const styles = {
      header: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 16 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        },
      },
      columnHeader: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '2E75B6' },
        },
      },
      cell: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      summaryCell: {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
    };

    // Add report title
    worksheet.mergeCells('A1:D1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report - ${attendance.teacher.teacherName} - ${attendance.course}`;
    worksheet.getCell('A1').style = styles.header;

    let rowIndex = 2;
    let totalAmount = 0;
    let totalFees = 0;
    let netProfit = 0;
    let totalInvoiceAmount = 0;

    // Add column headers
    worksheet.getRow(rowIndex).values = [
      '#',
      'Student Name',
      'Amount Paid (EGP)',
      'Student Code',
    ];
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.columnHeader));
    rowIndex++;

    // Add student data
    attendance.studentsPresent.forEach(
      ({ student, amountPaid, feesApplied }, index) => {
        if (!student) return;

        totalAmount += amountPaid;
        totalFees += feesApplied;
        netProfit += amountPaid - feesApplied;

        worksheet.getRow(rowIndex).values = [
          index + 1,
          student.studentName,
          amountPaid - feesApplied,
          student.studentCode,
        ];
        worksheet
          .getRow(rowIndex)
          .eachCell((cell) => (cell.style = styles.cell));
        rowIndex++;
      }
    );

    rowIndex++; // Space before invoices
    if (attendance.invoices.length > 0) {
      // Add invoice section header
      worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
      worksheet.getCell(`A${rowIndex}`).value = 'Invoice Details';
      worksheet.getCell(`A${rowIndex}`).style = styles.header;
      rowIndex++;

      // Add invoice headers
      worksheet.getRow(rowIndex).values = [
        'Invoice Details',
        'Invoice Amount (EGP)',
        'Type',
      ];
      worksheet
        .getRow(rowIndex)
        .eachCell((cell) => (cell.style = styles.columnHeader));
      rowIndex++;

      attendance.invoices.forEach(
        ({ invoiceDetails, invoiceAmount, time, addedBy }) => {
          const isNegative = invoiceAmount < 0;
          const displayAmount = isNegative
            ? Math.abs(invoiceAmount)
            : invoiceAmount;
          totalInvoiceAmount += invoiceAmount;

          const invoiceType = isNegative ? 'اضافه' : 'خصم';

          worksheet.getRow(rowIndex).values = [
            invoiceDetails,
            displayAmount, // Using absolute value for display
            invoiceType,
          ];

          // Apply special styling based on type (green for اضافه, red for خصم)
          worksheet.getRow(rowIndex).eachCell((cell) => {
            if (isNegative) {
              cell.style = {
                ...styles.cell,
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'CCFFCC' }, // Light green background for اضافه
                },
                font: {
                  color: { argb: '008000' }, // Green text for اضافه
                  bold: true,
                },
              };
            } else {
              cell.style = {
                ...styles.cell,
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFCCCB' }, // Light red background for خصم
                },
                font: {
                  color: { argb: 'FF0000' }, // Red text for خصم
                  bold: true,
                },
              };
            }
          });
          rowIndex++;
        }
      );

      rowIndex++; // Space before totals
    }

    rowIndex++; // Add space

    // Add summary rows
    const summaryData = [
      { title: 'Total', value: netProfit, color: 'e2ed47' }, // New color for Total
      {
        title: 'Total Invoices (EGP)',
        value: totalInvoiceAmount,
        color: 'FFA500', // Orange for Invoices
      },
      {
        title: 'Total Net Profit (EGP)',
        value: netProfit - totalInvoiceAmount,
        color: '4CAF50', // Green for Net Profit
      },
    ];

    summaryData.forEach(({ title, value, color }) => {
      worksheet.getCell(`A${rowIndex}`).value = title;
      worksheet.getCell(`A${rowIndex}`).style = styles.summaryCell;

      worksheet.getCell(`B${rowIndex}`).value = value;
      worksheet.getCell(`B${rowIndex}`).style = {
        ...styles.summaryCell,
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: color },
        },
      };
      rowIndex++;
    });

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Title/Student Name
      { width: 20 }, // Value/Amount
      { width: 20 }, // Amount Paid
      { width: 20 }, // Student Code
    ];

    // Send file via WhatsApp API
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Excel = buffer.toString('base64');
    const fileName = `Attendance_Report_${attendance.teacher.teacherName}_${
      attendance.course
    }_${new Date().toISOString().split('T')[0]}.xlsx`;

    try {
      await waService.sendExcelFileSimple(
        buffer,
        fileName,
        attendance.teacher.teacherPhoneNumber,
        waService.DEFAULT_ADMIN_PHONE,
        '20'
      );
    } catch (e) {
      console.error('Error sending Excel:', e);
    }

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating attendance Excel:', error);
    res.status(500).json({ message: 'Error generating attendance Excel' });
  }
};

// Teacher invoice function removed - no longer needed

// Invoice functions removed

// ======================================== End Attendance ======================================== //

// ======================================== handel Attendace ======================================== //

const handelAttendance = async (req, res) => {
  const allGroups = await Group.find({ isActive: true });
  res.render('employee/handelAttendance', {
    title: 'Handel Attendance',
    path: '/employee/handel-attendance',
    allGroups: allGroups,
  });
};

const getAttendanceByDate = async (req, res) => {
  try {
    const { startDate, endDate, groupId, searchStudent } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: 'يرجى تقديم تاريخ بداية ونهاية صالحين.' });
    }

    // Build the base query
    let attendanceQuery = {
      date: { $gte: startDate, $lte: endDate },
    };

    // Add group filter if provided
    if (groupId && groupId.trim() !== '') {
      attendanceQuery.group = groupId;
    }

    const attendances = await Attendance.find(attendanceQuery)
      .populate('studentsPresent.student')
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate('group', 'groupName')
      .sort({ date: -1 });

    if (!attendances.length) {
      return res
        .status(404)
        .json({ message: 'لا يوجد حضور في النطاق الزمني المحدد.' });
    }

    // Process attendance records and apply student search filter
    let allStudents = [];

    attendances.forEach((attendance) => {
      const groupName = attendance.group
        ? attendance.group.groupName
        : 'غير محدد';

      attendance.studentsPresent.forEach(({ student, addedBy }) => {
        if (!student) return;

        // Apply student search filter if provided
        if (searchStudent && searchStudent.trim() !== '') {
          const searchTerm = searchStudent.trim().toLowerCase();
          const studentCode = (student.studentCode || '')
            .toString()
            .toLowerCase();
          const studentName = (student.studentName || '').toLowerCase();
          const studentPhone = (student.studentPhoneNumber || '').toString();

          if (
            !studentCode.includes(searchTerm) &&
            !studentName.includes(searchTerm) &&
            !studentPhone.includes(searchTerm)
          ) {
            return; // Skip this student if it doesn't match search criteria
          }
        }

        // Add student to the list
        allStudents.push({
          studentId: student._id,
          studentName: student.studentName,
          studentCode: student.studentCode,
          studentPhone: student.studentPhoneNumber,
          parentPhone: student.studentParentPhone,
          groupName: groupName,
          attendanceDate: attendance.date,
          addedBy: addedBy ? addedBy.employeeName : 'غير محدد',
        });
      });
    });

    res.status(200).json({
      message: 'بيانات الحضور للنطاق الزمني',
      students: allStudents,
      totalStudents: allStudents.length,
      filters: {
        startDate,
        endDate,
        groupId: groupId || null,
        searchStudent: searchStudent || null,
      },
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'يبدو ان هناك مشكله ما حاول مره اخري' });
  }
};

const downloadAttendanceExcelByDate = async (req, res) => {
  const { startDate, endDate, groupId, searchStudent } = req.query;
  try {
    // Build the base query
    let attendanceQuery = {
      date: { $gte: startDate, $lte: endDate },
    };

    // Add group filter if provided
    if (groupId && groupId.trim() !== '') {
      attendanceQuery.group = groupId;
    }

    // Fetch attendance records within the date range
    const attendances = await Attendance.find(attendanceQuery)
      .populate('studentsPresent.student')
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate('group', 'groupName');

    if (!attendances.length) {
      return res.status(404).json({
        message: 'No attendance records found for the given date range',
      });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Styles
    const styles = {
      header: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 16 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        },
      },
      columnHeader: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '2E75B6' },
        },
      },
      cell: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      totalRow: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF5733' },
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
    };

    // Title
    worksheet.mergeCells('A1:H1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report - ${startDate} to ${endDate}`;
    worksheet.getCell('A1').style = styles.header;

    let rowIndex = 2;
    let allStudents = [];

    // Process attendance data with group filtering
    attendances.forEach((attendance) => {
      const groupName = attendance.group
        ? attendance.group.groupName
        : 'غير محدد';

      attendance.studentsPresent.forEach(({ student, addedBy }) => {
        if (!student) return;

        // Apply student search filter if provided
        if (searchStudent && searchStudent.trim() !== '') {
          const searchTerm = searchStudent.trim().toLowerCase();
          const studentCode = (student.studentCode || '')
            .toString()
            .toLowerCase();
          const studentName = (student.studentName || '').toLowerCase();
          const studentPhone = (student.studentPhoneNumber || '').toString();

          if (
            !studentCode.includes(searchTerm) &&
            !studentName.includes(searchTerm) &&
            !studentPhone.includes(searchTerm)
          ) {
            return; // Skip this student if it doesn't match search criteria
          }
        }

        allStudents.push({
          studentName: student.studentName,
          studentCode: student.studentCode,
          phoneNumber: student.studentPhoneNumber,
          parentPhone: student.studentParentPhone,
          groupName: groupName,
          attendanceDate: attendance.date,
          addedBy: addedBy ? addedBy.employeeName : 'غير محدد',
        });
      });
    });

    // **Students Data**
    worksheet.getRow(rowIndex).values = [
      'Student Name',
      'Student Code',
      'Phone Number',
      'Parent Phone',
      'Group Name',
      'Attendance Date',
      'Added By',
    ];
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.columnHeader));
    rowIndex++;

    allStudents.forEach((student) => {
      worksheet.getRow(rowIndex).values = [
        student.studentName,
        student.studentCode,
        student.phoneNumber,
        student.parentPhone,
        student.groupName,
        student.attendanceDate,
        student.addedBy,
      ];
      worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.cell));
      rowIndex++;
    });

    // **Summary**
    worksheet.getRow(rowIndex).values = [
      'Total Students',
      '',
      '',
      '',
      '',
      '',
      allStudents.length,
    ];
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.totalRow));

    worksheet.columns = [
      { width: 25 }, // Student Name
      { width: 15 }, // Student Code
      { width: 20 }, // Phone Number
      { width: 20 }, // Parent Phone
      { width: 20 }, // Group Name
      { width: 15 }, // Attendance Date
      { width: 20 }, // Added By
    ];

    // Export Excel file
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Attendance_Report_${new Date().toDateString()}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating attendance Excel:', error);
    res.status(500).json({ message: 'Error generating attendance Excel' });
  }
};

const downloadAndSendExcelForTeacherByDate = async (req, res) => {
  const { teacherId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    // Fetch attendance records within the given date range
    const attendance = await Attendance.findOne({
      date: { $gte: startDate, $lte: endDate },
      teacher: teacherId,
    })
      .populate({
        path: 'studentsPresent.student',
        populate: {
          path: 'selectedTeachers.teacherId',
          select:
            'teacherName subjectName teacherPhoneNumber teacherFees paymentType',
        },
      })
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate(
        'teacher',
        'teacherName teacherPhoneNumber subjectName paymentType'
      )
      .populate('invoices.addedBy', 'employeeName');

    if (!attendance || attendance.length === 0) {
      return res.status(404).json({
        message: 'No attendance records found for the given date range',
      });
    }

    // Filter teacher-related student entries safely using optional chaining
    const teacherRelatedStudents = attendance.studentsPresent;

    if (teacherRelatedStudents.length === 0) {
      return res
        .status(404)
        .json({ message: 'No students found for the given teacher' });
    }

    // Get teacher info (assuming all entries are for the same teacher)
    const teacher = attendance.teacher;

    console.log('Teacher:', teacher);
    const teacherName = teacher.teacherName.replace(/\s+/g, '_'); // Replace spaces with underscores
    const teacherPhoneNumber = teacher.teacherPhoneNumber;
    const isPerSession = teacher.paymentType === 'perSession';
    console.log(teacherName, teacherPhoneNumber, isPerSession);
    // Create workbook and worksheet using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define reusable styles
    const styles = {
      header: {
        font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        },
      },
      columnHeader: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '2E75B6' },
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      cell: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      totalRow: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF5733' },
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      studentCountRow: {
        font: { bold: true, size: 14, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4CAF50' },
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
    };

    // Add report title
    worksheet.mergeCells('A1:H1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report for ${teacherName} (${startDate} to ${endDate})`;
    worksheet.getCell('A1').style = styles.header;

    // Set column headers (including the attendance date)
    const headerRowValues = isPerSession
      ? [
          'Student Name',
          // 'Phone Number',
          'Amount Paid (EGP)',
          // 'Center Fees (EGP)',
          // 'Net Profit (EGP)',
          // 'Added By',
          'Student Code',
        ]
      : [
          'Student Name',
          // 'Phone Number',
          'Amount Paid (EGP)',
          // 'Amount Remaining (EGP)',
          // 'Added By',
          'Student Code',
        ];

    worksheet.getRow(2).values = headerRowValues;
    worksheet.getRow(2).eachCell((cell) => (cell.style = styles.columnHeader));

    // Populate student data rows
    let rowIndex = 3;
    teacherRelatedStudents.forEach((entry) => {
      const studentName = entry.student.studentName;
      const phoneNumber = entry.student.studentPhoneNumber;
      const amountPaid = entry.amountPaid;
      const feesApplied = entry.feesApplied || 0;
      const addedBy = entry.addedBy ? entry.addedBy.employeeName : 'Unknown';
      const studentCode = entry.student.studentCode;

      if (isPerSession) {
        const netProfit = amountPaid - feesApplied;
        worksheet.getRow(rowIndex).values = [
          studentName,
          // phoneNumber,
          amountPaid,
          // feesApplied,
          // netProfit,
          // addedBy,
          studentCode,
        ];
      } else {
        const amountRemaining = amountPaid - feesApplied;
        worksheet.getRow(rowIndex).values = [
          studentName,
          // phoneNumber,
          amountPaid,
          // amountRemaining,
          // addedBy,
          studentCode,
        ];
      }
      worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.cell));
      rowIndex++;
    });

    // Calculate totals
    const totalAmountPaid = teacherRelatedStudents.reduce(
      (sum, entry) => sum + entry.amountPaid,
      0
    );
    const totalFees = teacherRelatedStudents.reduce(
      (sum, entry) => sum + (entry.feesApplied || 0),
      0
    );
    const totalNetProfit = teacherRelatedStudents.reduce(
      (sum, entry) => sum + (entry.amountPaid - (entry.feesApplied || 0)),
      0
    );

    // Add totals row
    if (isPerSession) {
      worksheet.getRow(rowIndex).values = [
        'Total',
        '',
        totalAmountPaid,
        totalFees,
        totalNetProfit,
        '',
        '',
      ];
    } else {
      worksheet.getRow(rowIndex).values = [
        'Total',
        '',
        totalAmountPaid,
        totalAmountPaid - totalFees,
        '',
        '',
      ];
    }
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.totalRow));
    rowIndex++;

    // Add a summary row for total student count
    worksheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    worksheet.getCell(
      `A${rowIndex}`
    ).value = `Total Students for ${teacherName}: ${teacherRelatedStudents.length}`;
    worksheet.getCell(`A${rowIndex}`).style = styles.studentCountRow;

    rowIndex++; // Space before invoices

    // Add invoice section header
    worksheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value = 'Invoice Details';
    worksheet.getCell(`A${rowIndex}`).style = styles.header;
    rowIndex++;

    // Add invoice headers
    worksheet.getRow(rowIndex).values = [
      'Invoice Details',
      'Invoice Amount (EGP)',
      'Time',
      'Added By',
    ];
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.columnHeader));
    rowIndex++;

    let totalInvoiceAmount = 0;
    attendance.invoices.forEach(
      ({ invoiceDetails, invoiceAmount, time, addedBy }) => {
        totalInvoiceAmount += invoiceAmount;

        worksheet.getRow(rowIndex).values = [
          invoiceDetails,
          invoiceAmount,
          time,
          addedBy.employeeName,
        ];
        worksheet
          .getRow(rowIndex)
          .eachCell((cell) => (cell.style = styles.cell));
        rowIndex++;
      }
    );

    rowIndex++; // Space before totals

    // Add total invoices row
    worksheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value = 'Total Invoices';
    worksheet.getCell(`A${rowIndex}`).style = styles.totalRow;
    worksheet.getCell(`C${rowIndex}`).value = totalInvoiceAmount;
    worksheet.getCell(`C${rowIndex}`).style = styles.totalRow;
    rowIndex++;

    rowIndex++; // Space before final summary

    // Add final summary header
    worksheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value = 'Final Summary';
    worksheet.getCell(`A${rowIndex}`).style = styles.header;
    rowIndex++;

    // Add total row with new headers
    worksheet.getRow(rowIndex).values = [
      'Total Amount Paid (EGP)',
      'Center Fees (EGP)',
      // 'Total Invoices (EGP)',
      // 'Net Profit Before Invoice (EGP)',
      'Final Net Profit (EGP)',
    ];
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.columnHeader));
    rowIndex++;

    worksheet.getRow(rowIndex).values = [
      totalAmountPaid,
      totalFees,
      // totalInvoiceAmount,
      // totalNetProfit,
      totalNetProfit - totalInvoiceAmount,
    ];
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.totalRow));
    rowIndex++;

    // Adjust column widths
    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount Paid
      { width: 20 }, // Center Fees / Amount Remaining
      { width: 20 }, // Net Profit if perSession (column hidden if not)
      { width: 20 }, // Added By
      { width: 20 }, // Student Code
    ];

    // Export the workbook to a buffer and convert to Base64
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Excel = buffer.toString('base64');

    // Define file name for both download and WhatsApp sending
    const fileName = `Attendance_Report_${teacherName}_${startDate}_to_${endDate}.xlsx`;

    // Send file via WhatsApp API
    try {
      await waService.sendExcelFileSimple(
        buffer,
        fileName,
        teacherPhoneNumber,
        waService.DEFAULT_ADMIN_PHONE,
        '20'
      );
    } catch (error) {
      console.error('Error sending Excel file via WhatsApp:', error);
    }

    console.log('Excel file sent via WhatsApp');

    // Set response headers and send the file as an attachment
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (error) {
    console.error('Error generating and sending attendance report:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error processing the request' });
    }
  }
};

const downloadAndSendExcelForEmployeeByDate = async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  try {
    // Fetch attendance records within the date range
    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: 'studentsPresent.student',
        populate: {
          path: 'studentTeacher',
          select:
            'teacherName subjectName teacherPhoneNumber teacherFees paymentType ',
        },
      })
      .populate('studentsPresent.addedBy', 'employeeName employeePhoneNumber');

    if (!attendances || attendances.length === 0) {
      return res.status(404).json({
        message: 'No attendance records found for the given date range',
      });
    }

    // Filter students added by the given employee

    const employeeRelatedStudents = attendances.flatMap((attendance) =>
      attendance.studentsPresent.filter(
        (entry) => entry.addedBy._id.toString() === id
      )
    );

    if (employeeRelatedStudents.length === 0) {
      return res
        .status(404)
        .json({ message: 'No students found for the given employee' });
    }

    const employee = employeeRelatedStudents[0].addedBy;
    const employeeName = employee.employeeName.replace(/\s+/g, '_'); // Replace spaces with underscores
    const employeePhoneNumber = employee.employeePhoneNumber;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define reusable styles

    const styles = {
      header: {
        font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        },
      },

      columnHeader: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '2E75B6' },
        },
      },

      cell: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },

      totalRow: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF5733' },
        },
      },

      studentCountRow: {
        font: { bold: true, size: 14, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4CAF50' },
        }, // Green color for visibility
      },
    };

    // Add report title

    worksheet.mergeCells('A1:F1');

    worksheet.getCell(
      'A1'
    ).value = `Attendance Report for ${employee.employeeName} (${startDate} to ${endDate})`;

    worksheet.getCell('A1').style = styles.header;

    // Add column headers

    worksheet.getRow(2).values = [
      'Student Name',
      'Phone Number',
      'Amount Paid (EGP)',
      'Fees Applied (EGP)',
      'Added By',
    ];

    worksheet.getRow(2).eachCell((cell) => (cell.style = styles.columnHeader));

    let totalAmountPaid = 0;
    let totalFees = 0;
    let rowIndex = 3;

    // Add student data rows for related students

    employeeRelatedStudents.forEach(({ student, amountPaid, feesApplied }) => {
      const studentName = student.studentName;
      const studentPhoneNumber = student.studentPhoneNumber;

      worksheet.getRow(rowIndex).values = [
        studentName,
        studentPhoneNumber,
        amountPaid,
        feesApplied,
        employee.employeeName,
      ];

      worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.cell));

      totalAmountPaid += amountPaid;
      totalFees += feesApplied;

      rowIndex++;
    });

    // Add totals row

    worksheet.getRow(rowIndex).values = [
      'Total',
      '',
      totalAmountPaid,
      totalFees,
      '',
    ];

    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.totalRow));

    // Add total student count for the employee-related students

    rowIndex++; // Move to the next row after the totals

    worksheet.mergeCells(`A${rowIndex}:F${rowIndex}`); // Merge all cells for the student count row

    worksheet.getCell(
      `A${rowIndex}`
    ).value = `Total Students for ${employee.employeeName}: ${employeeRelatedStudents.length}`;

    worksheet.getCell(`A${rowIndex}`).style = styles.studentCountRow;

    // Adjust column widths

    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount Paid
      { width: 20 }, // Fees Applied
      { width: 20 }, // Added By
    ];

    // Export the Excel file to buffer

    const buffer = await workbook.xlsx.writeBuffer();

    const base64Excel = buffer.toString('base64');

    // File name for download and WhatsApp

    const fileName = `Attendance_Report_${employeeName}_${
      new Date().toISOString().split('T')[0]
    }.xlsx`;

    // Send file via WhatsApp API

    try {
      await waService.sendExcelFileSimple(
        buffer,
        fileName,
        employeePhoneNumber,
        waService.DEFAULT_ADMIN_PHONE,
        '20'
      );
    } catch (error) {
      console.error('Error sending Excel file via WhatsApp:', error);
    }

    console.log('Excel file sent via WhatsApp');

    // Send the file as an attachment

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}`);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error('Error generating and sending attendance report:', error);

    if (!res.headersSent) {
      res.status(500).json({ message: 'Error processing the request' });
    }
  }
};

// ======================================== End handel Attendace ======================================== //

// ======================================== LogOut ======================================== //

const logOut = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

// ======================================== Student Logs ======================================== //

const getStudentLogs = async (req, res) => {
  try {
    const allGroups = await Group.find(
      { isActive: true },
      { groupName: 1, groupFees: 1 }
    );

    res.render('employee/studentLogs', {
      title: 'Student Logs',
      path: '/employee/student-logs',
      allGroups,
    });
  } catch (error) {
    console.error('Error loading student logs page:', error);
    res
      .status(500)
      .send('An error occurred while loading the student logs page');
  }
};

const getStudentLogsData = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { groupId, startDate, endDate } = req.query;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    const student = await Student.findById(studentId)
      .populate('groups', 'groupName')
      .populate('monthlyPaymentPaidBy', 'employeeName')
      .populate('monthlyPaymentHistory.paidBy', 'employeeName');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Attendance only
    const query = { 'studentsPresent.student': studentId };
    if (groupId) query.group = groupId;
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };

    const attendanceDocs = await Attendance.find(query)
      .populate('group', 'groupName')
      .populate('studentsPresent.addedBy', 'employeeName')
      .sort({ date: -1 });

    const attendanceRecords = [];
    attendanceDocs.forEach((doc) => {
      const present = doc.studentsPresent.find(
        (sp) => String(sp.student) === String(studentId)
      );
      if (present) {
        attendanceRecords.push({
          date: doc.date,
          group: doc.group,
          addedBy: present.addedBy,
        });
      }
    });

    // Handle monthly payment history
    const history = Array.isArray(student.monthlyPaymentHistory)
      ? student.monthlyPaymentHistory
      : [];
    
    // Determine if student has paid (either through monthlyPaymentPaid or has history)
    const hasPaid = student.monthlyPaymentPaid || history.length > 0;
    
    // Get last payment from history or from monthlyPaymentDate
    const lastPayment = history.length > 0
      ? history[history.length - 1]
      : student.monthlyPaymentPaid && student.monthlyPaymentDate
      ? { 
          date: student.monthlyPaymentDate, 
          paidBy: student.monthlyPaymentPaidBy 
        }
      : null;

    res.status(200).json({
      student: {
        _id: student._id,
        studentName: student.studentName,
        studentCode: student.studentCode,
        studentPhoneNumber: student.studentPhoneNumber,
        studentParentPhone: student.studentParentPhone,
        schoolName: student.schoolName,
        groups: student.groups,
        monthlyPaymentPaid: hasPaid, // Use calculated value
        monthlyPaymentDate: student.monthlyPaymentDate,
        lastMonthlyPayment: lastPayment,
      },
      attendanceRecords,
      monthlyPaymentHistory: history, // Include full history
    });
  } catch (error) {
    console.error('Error fetching student logs data:', error);
    res.status(500).json({ message: 'An error occurred while fetching student logs data' });
  }
};

// ==================== NOTIFICATION MANAGEMENT ====================

const getNotificationsPage = async (req, res) => {
  try {
    res.render('employee/notifications', {
      title: 'المتبقي',
      user: req.user,
      path: '/employee/notifications',
    });
  } catch (error) {
    console.error('Error loading notifications page:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while loading notifications page' });
  }
};

// Students with balances functionality removed - no longer using selectedTeachers schema

// Students with installments functionality removed - no longer using selectedTeachers schema

const sendNotification = async (req, res) => {
  try {
    const { studentId, message, phoneNumber, notificationType } = req.body;

    // Validate required fields
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف والرسالة مطلوبان',
      });
    }

    console.log(`Attempting to send notification to ${phoneNumber}`);

    // Format phone number like the working sendWa function
    const formattedPhoneNumber = `2${phoneNumber}@c.us`;
    console.log(`Formatted phone number: ${formattedPhoneNumber}`);

    // Send WhatsApp message using the same method as sendWa (without status check)
    const response = await waService.sendWasenderMessage(
      message,
      formattedPhoneNumber,
      waService.DEFAULT_ADMIN_PHONE
    );

    if (response && response.data && response.data.status === 'success') {
      // Log the notification
      console.log(`Notification sent successfully to ${phoneNumber}`);

      res.json({
        success: true,
        message: 'تم إرسال الإشعار بنجاح',
        response: response.data,
      });
    } else {
      console.error('Waziper API returned error:', response?.data);
      res.status(400).json({
        success: false,
        message: 'فشل في إرسال الإشعار',
        error: response?.data?.message || 'Unknown error from Waziper API',
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);

    // Provide more specific error messages
    let errorMessage = 'حدث خطأ أثناء إرسال الإشعار';

    if (error.message === 'Invalid phone number') {
      errorMessage = 'رقم الهاتف غير صحيح';
    } else if (error.message === 'Message cannot be empty') {
      errorMessage = 'الرسالة لا يمكن أن تكون فارغة';
    } else if (
      error.code === 'ECONNABORTED' ||
      error.message.includes('timeout')
    ) {
      errorMessage = 'انتهت مهلة الاتصال، يرجى المحاولة مرة أخرى';
    } else if (error.response && error.response.status === 400) {
      errorMessage = 'خطأ في البيانات المرسلة إلى واتساب';
    } else if (error.response && error.response.status === 401) {
      errorMessage = 'خطأ في مصادقة واتساب';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
};

const sendBulkNotifications = async (req, res) => {
  try {
    const { students, message, notificationType } = req.body;

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const student of students) {
      try {
        const phoneNumber = student.parentPhone || student.studentPhone;
        const formattedPhoneNumber = `2${phoneNumber}@c.us`;
        const personalizedMessage = message
          .replace('{studentName}', student.studentName)
          .replace('{teacherName}', student.teacherName)
          .replace('{courseName}', student.courseName)
          .replace('{amountRemaining}', student.amountRemaining)
          .replace('{totalCourseCost}', student.totalCourseCost);

        const response = await waService.sendWasenderMessage(
          personalizedMessage,
          formattedPhoneNumber,
          waService.DEFAULT_ADMIN_PHONE
        );

        if (response && response.data && response.data.status === 'success') {
          successCount++;
          results.push({
            studentId: student.studentId,
            studentName: student.studentName,
            phone: phoneNumber,
            status: 'success',
            message: 'تم الإرسال بنجاح',
          });
        } else {
          failureCount++;
          results.push({
            studentId: student.studentId,
            studentName: student.studentName,
            phone: phoneNumber,
            status: 'failed',
            message: response?.data?.message || 'فشل في الإرسال',
          });
        }

        // Add delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        failureCount++;
        results.push({
          studentId: student.studentId,
          studentName: student.studentName,
          phone: student.parentPhone || student.studentPhone,
          status: 'error',
          message: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `تم إرسال ${successCount} إشعار بنجاح، وفشل ${failureCount} إشعار`,
      results,
      summary: {
        total: students.length,
        success: successCount,
        failure: failureCount,
      },
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إرسال الإشعارات المجمعة',
    });
  }
};

const getNotificationTemplates = async (req, res) => {
  try {
    // Default templates with proper MongoDB-like structure
    const templates = [
      {
        _id: 'balance_reminder_001',
        name: 'تذكير بالمبلغ المتبقي',
        message:
          'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م في كورس {courseName} مع الأستاذ {teacherName}. يرجى التواصل معنا لتسديد المبلغ المتبقي.',
        type: 'balance',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        _id: 'installment_reminder_001',
        name: 'تذكير بالقسط التالي',
        message:
          'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م من إجمالي {totalCourseCost} ج.م في كورس {courseName}. يرجى التواصل معنا لدفع القسط التالي.',
        type: 'installment',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        _id: 'course_completion_001',
        name: 'إشعار إكمال الكورس',
        message:
          'مرحباً {studentName}، تم إكمال كورس {courseName} مع الأستاذ {teacherName} بنجاح. شكراً لثقتكم بنا!',
        type: 'completion',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        _id: 'welcome_message_001',
        name: 'رسالة ترحيب',
        message:
          'مرحباً {studentName}، أهلاً وسهلاً بك في مركز GTA. نتمنى لك تجربة تعليمية ممتعة في كورس {courseName} مع الأستاذ {teacherName}.',
        type: 'welcome',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while fetching templates' });
  }
};

const saveNotificationTemplate = async (req, res) => {
  try {
    const { name, message, type } = req.body;

    // In a real application, you would save this to a database
    // For now, we'll just return success
    console.log('Template saved:', { name, message, type });

    res.json({
      success: true,
      message: 'تم حفظ القالب بنجاح',
    });
  } catch (error) {
    console.error('Error saving notification template:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حفظ القالب',
    });
  }
};

const deleteNotificationTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    // In a real application, you would delete from database
    console.log('Template deleted:', templateId);

    res.json({
      success: true,
      message: 'تم حذف القالب بنجاح',
    });
  } catch (error) {
    console.error('Error deleting notification template:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف القالب',
    });
  }
};

const updateNotificationTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, message, type } = req.body;

    // In a real application, you would update in database
    console.log('Template updated:', { templateId, name, message, type });

    res.json({
      success: true,
      message: 'تم تحديث القالب بنجاح',
    });
  } catch (error) {
    console.error('Error updating notification template:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث القالب',
    });
  }
};

const blockStudent = async (req, res) => {
  const { studentId } = req.params;
  const { reason } = req.body;
  const employeeId = req.employeeId;

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.isBlocked) {
      return res.status(400).json({ message: 'Student is already blocked' });
    }

    // Update student to blocked status
    student.isBlocked = true;
    student.blockReason = reason;
    student.blockedBy = employeeId;
    student.blockedAt = new Date();

    await student.save();

    // Send WhatsApp message to parent
    const parentMessage = `
عزيزي ولي أمر الطالب ${student.studentName},
-----------------------------
نود إعلامكم بأن الطالب تم ايقافه من السنتر مؤقتاً.
السبب: ${reason}
التاريخ: ${new Date().toLocaleDateString()}
يرجى التواصل مع إدارة السنتر لحل المشكلة.
شكراً لتفهمكم.
`;

    try {
      const resp = await waService.sendWasenderMessage(
        parentMessage,
        student.studentParentPhone,
        waService.DEFAULT_ADMIN_PHONE
      );
      if (!resp.success)
        console.error('Error sending WhatsApp message:', resp.message);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    }

    res.status(200).json({
      message: 'Student blocked successfully',
      student,
    });
  } catch (error) {
    console.error('Error blocking student:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while blocking student' });
  }
};

const unblockStudent = async (req, res) => {
  const { studentId } = req.params;
  const employeeId = req.employeeId;

  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.isBlocked) {
      return res.status(400).json({ message: 'Student is not blocked' });
    }

    // Update student to unblocked status
    student.isBlocked = false;
    student.blockReason = '';
    student.blockedBy = null;
    student.blockedAt = null;

    await student.save();

    // Send WhatsApp message to parent
    const parentMessage = `
عزيزي ولي أمر الطالب ${student.studentName},
-----------------------------
نود إعلامكم بأن الطالب تم إلغاء حظره من السنتر.
يمكن للطالب الآن العودة للحضور بشكل طبيعي.
التاريخ: ${new Date().toLocaleDateString()}
شكراً لتعاونكم.
`;

    try {
      const resp = await waService.sendWasenderMessage(
        parentMessage,
        student.studentParentPhone,
        waService.DEFAULT_ADMIN_PHONE
      );
      if (!resp.success)
        console.error('Error sending WhatsApp message:', resp.message);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    }

    res.status(200).json({
      message: 'Student unblocked successfully',
      student,
    });
  } catch (error) {
    console.error('Error unblocking student:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while unblocking student' });
  }
};

// ======================== WhatsApp Admin Session Connect (Strict) ======================== //
const connectWhatsApp_Get = async (req, res) => {
  try {
    // Only allow the single fixed number
    const adminNumber = waService.DEFAULT_ADMIN_PHONE;
    // Try to fetch session; if missing or not connected, show connect page
    let sessionInfo = null;
    try {
      sessionInfo = await waService.getAdminSessionStrict();
    } catch (e) {
      sessionInfo = null;
    }
    const status =
      sessionInfo && sessionInfo.status ? sessionInfo.status : 'DISCONNECTED';
    res.render('employee/connectWhatsapp', {
      title: 'Connect WhatsApp',
      path: '/employee/connect-whatsapp',
      adminNumber,
      status,
    });
  } catch (error) {
    res.status(500).send('Error loading WhatsApp connect page');
  }
};

const connectWhatsApp_Start = async (req, res) => {
  try {
    // Ensure only the fixed number is allowed
    const connectResp = await waService.connectAdminSession();
    if (!connectResp.success) {
      return res
        .status(400)
        .json({
          success: false,
          message: connectResp.message || 'Failed to start connection',
        });
    }
    res.json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Error initiating connection' });
  }
};

const connectWhatsApp_QR = async (req, res) => {
  try {
    const qrResp = await waService.getAdminQRCode();
    if (!qrResp.success) {
      return res
        .status(400)
        .json({
          success: false,
          message: qrResp.message || 'Failed to get QR code',
        });
    }
    // Wasender shape handling: try common places
    const qrcode =
      qrResp.data?.qrcode ||
      qrResp.data?.qrCode ||
      qrResp.data?.qr ||
      qrResp.qrcode ||
      qrResp.qrCode ||
      null;
    if (!qrcode) {
      // Fallback: if API returns a token/QR string in data
      const token = qrResp.data?.token || qrResp.token || null;
      if (token) return res.json({ success: true, qrcode: token });
      return res
        .status(404)
        .json({ success: false, message: 'QR code not available yet' });
    }
    res.json({ success: true, qrcode });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error getting QR code' });
  }
};

module.exports = {
  dashboard,
  getDashboardStats,
  testDevice,
  getDevices,
  checkStudentCodes,
  // Billing functions removed

  // Add Student
  getAddStudent,
  getAllStudents,
  getStudent,
  updateStudent,
  addStudent,
  getDeviceData,
  searchStudent,
  sendWa,
  deleteStudent,
  sendCodeAgain,
  // Installment and course functions removed

  // Teacher functions removed

  // Attendance
  getAttendance,
  attendStudent,
  getAttendedStudents,
  deleteAttendStudent,
  payMonthlyFee,
  resetMonthlyPayments,
  downloadAttendanceExcel,
  // Invoice functions removed

  // handel Attendance
  handelAttendance,
  getAttendanceByDate,
  downloadAttendanceExcelByDate,
  downloadAndSendExcelForTeacherByDate,
  downloadAndSendExcelForEmployeeByDate,

  // Student Logs
  getStudentLogs,
  getStudentLogsData,

  // Notification Management
  getNotificationsPage,
  // getStudentsWithBalances, // Removed - no longer using selectedTeachers
  // getStudentsWithInstallments, // Removed - no longer using selectedTeachers
  sendNotification,
  sendBulkNotifications,
  getNotificationTemplates,
  saveNotificationTemplate,
  deleteNotificationTemplate,
  updateNotificationTemplate,

  logOut,
  blockStudent,
  unblockStudent,
  // WhatsApp connect page handlers will be appended by next edit
  connectWhatsApp_Get,
  connectWhatsApp_Start,
  connectWhatsApp_QR,
};
