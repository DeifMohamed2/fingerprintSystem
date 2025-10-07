const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new Schema(
  {
    studentName: {
      type: String,
      required: true,
    },
    studentPhoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    studentParentPhone: {
      type: String,
      required: true,
    },
    // Student can be enrolled in multiple groups
    groups: [{
      type: Schema.Types.ObjectId,
      ref: 'Group',
    }],
    schoolName: {
      type: String,
      required: false,
    },
    attendanceNumber: {
      type: Number,
      default: 0,
      required: false,
    },
    paymentType: {
      type: String,
      enum: ['perSession'],
      default: 'perSession',
    },
    // Monthly payment tracking
    monthlyPaymentPaid: {
      type: Boolean,
      default: false,
    },
    monthlyPaymentDate: {
      type: Date,
      default: null,
    },
    monthlyPaymentPaidBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    barCode: {
      type: String,
      required: false,
    },
    studentCode: {
      type: String,
      required: true,
      unique: true,

    },
    // Blocking functionality
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockReason: {
      type: String,
      default: '',
    },
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Track monthly payment history for auditing and logs
// Each entry stores the payment date and the employee who recorded it
studentSchema.add({
  monthlyPaymentHistory: [
    {
      date: { type: Date, required: true },
      paidBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
      amount: { type: Number, required: false, default: 0 },
    },
  ],
});

studentSchema.index({ 'monthlyPaymentHistory.date': -1 });

// Add indexes for better performance
studentSchema.index({ studentCode: 1 }, { unique: true });
studentSchema.index({ studentPhoneNumber: 1 }, { unique: true });
studentSchema.index({ barCode: 1 });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;