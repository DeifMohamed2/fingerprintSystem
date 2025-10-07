require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('../models/employee');

async function run() {
  try {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/attendanceFingerprint';
    await mongoose.connect(mongoUrl);

    // Define three employee accounts
    const employees = [
      {
        employeeName: 'أحمد محمد',
        employeePhoneNumber: '01111111111',
        employeePassword: '123456',
        role: 'Employee',
        employeeSalary: 1000,
        device: 1
      },
      {
        employeeName: 'فاطمة علي',
        employeePhoneNumber: '01222222222',
        employeePassword: '123456',
        role: 'Employee',
        employeeSalary: 1000,
        device: 1
      },
      {
        employeeName: 'محمد أحمد',
        employeePhoneNumber: '01333333333',
        employeePassword: '123456',
        role: 'Employee',
        employeeSalary: 1000,
        device: 1
      }
    ];

    console.log('🌱 Starting employee seeding...');

    for (const employeeData of employees) {
      // Check if employee already exists
      const existing = await Employee.findOne({ 
        employeePhoneNumber: employeeData.employeePhoneNumber 
      });
      
      if (existing) {
        console.log(`✅ Employee already exists: ${employeeData.employeeName} (${employeeData.employeePhoneNumber})`);
        continue;
      }

      // Create new employee
      const employee = new Employee(employeeData);
      await employee.save();
      console.log(`✅ Created employee: ${employee.employeeName} (${employee.employeePhoneNumber})`);
    }

    console.log('🎉 Employee seeding completed successfully!');
    console.log('\n📋 Employee Login Credentials:');
    console.log('================================');
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. Name: ${emp.employeeName}`);
      console.log(`   Phone: ${emp.employeePhoneNumber}`);
      console.log(`   Password: ${emp.employeePassword}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

run();


