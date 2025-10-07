const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema(
  {
    groupName: {
      type: String,
      required: true,
      trim: true,
    },
    groupDescription: {
      type: String,
      required: false,
      trim: true,
    },
    schedule: {
      type: Map, // A map to represent the days of the week
      of: [
        {
          startTime: {
            type: String,
            required: true,
          },
          endTime: {
            type: String,
            required: true,
          },
          roomID: {
            type: String,
            required: true,
          },
        },
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentStudents: {
      type: Number,
      default: 0,
    },

    students : {
      type: [Schema.Types.ObjectId],
      ref: 'Student',
      default: [],
    }
  },
  { timestamps: true }
);

// Create and export the Group model
const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
