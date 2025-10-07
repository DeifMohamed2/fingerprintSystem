const mongoose = require('mongoose');
const Student = require('../models/student');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendanceFingerprint', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function resetMonthlyPayments() {
  try {
    console.log('Starting monthly payment reset...');
    
    const result = await Student.updateMany(
      {},
      {
        $set: {
          monthlyPaymentPaid: false,
          monthlyPaymentDate: null,
          monthlyPaymentPaidBy: null
        }
      }
    );
    
    console.log(`✅ Reset monthly payments for ${result.modifiedCount} students`);
    console.log('Monthly payment reset completed successfully!');
    
  } catch (error) {
    console.error('❌ Error resetting monthly payments:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
resetMonthlyPayments();
