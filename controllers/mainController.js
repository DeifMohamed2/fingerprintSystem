const Employee = require('../models/employee');
const jwt = require('jsonwebtoken');
const waService = require('../utils/waService');

const jwtSecret = process.env.JWT_SECRET;

const homePage = (req, res) => {
    res.render('index', { title: 'Attendance Fingerprint System' });
}; 

const singIn = async (req, res) => {
    const { phoneNumber, password } = req.body;

    console.log(req.body);

    // Try Employee login
    let user = await Employee.findOne({
      employeePhoneNumber: phoneNumber,
      employeePassword: password,
    });
    
    if (user) {
      const token = jwt.sign({ employeeId: user._id }, jwtSecret);
      res.cookie('token', token, { httpOnly: true });
      return res.send(user);
    }
    
    return res.status(404).send({message :'Employee not found'});
};

module.exports = {
  homePage,
  singIn,
};