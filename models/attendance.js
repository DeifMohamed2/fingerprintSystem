const { add } = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attendanceSchema = new Schema(
  {
    studentsPresent: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      },
    ],
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    isFinalized: { type: Boolean, default: false },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    totalAmount: { type: Number, default: 0 },
    totalFees: { type: Number, required: false, default: 0 },
    // Invoice functionality removed
    date: { type: String, required: true },
    centerFeesCollected: { type: Boolean, default: false },
    collectedAt: { type: Date },
  },
  { timestamps: true }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
