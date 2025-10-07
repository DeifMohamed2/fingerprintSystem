const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeeSchema = new Schema(
  {
    role: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    employeePhoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    employeePassword: {
      type: String,
      required: true,
    },
    employeeSalary: {
      type: Number,
      required: true,
    },
    KPIs: {
      type: Array,
      default: [],
      required: false,
    },
    Losses: {
      type: Array,
      default: [],
      required: false,
    },
    totalKPIs: {
      type: Number,
      default: 0,
      required: false,
    },
    totalLosses: {
      type: Number,
      default: 0,
      required: false,
    },
    totalSalary: {
      type: Number,
      required: false,
    },
    ordersHistory: {
      type: Array,
      default: [],
      required: false,
    },
    device: {
      type: String,
      default: 'device1',
      required: true,
    },
  },
  { timestamps: true }
);

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
