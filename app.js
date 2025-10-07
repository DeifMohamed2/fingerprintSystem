require('dotenv').config();
const express = require('express');
const http = require('http');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const mainRoute = require('./routes/mainRoute');
const employeeRoute = require('./routes/employeeRoute');
const schedule = require('node-schedule');
const { resetMonthlyPayments } = require('./controllers/employeeController');

// express app
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});
app.use(express.json());

// CONECT to mongodb
// let io
// const dbURI = 'mongodb://localhost:27017/ElkablyCenter';


const dbURI ='mongodb+srv://deif:1qaz2wsx@3devway.aa4i6ga.mongodb.net/fingerprintSystem?retryWrites=true&w=majority&appName=Cluster0';
mongoose
  .connect(dbURI)
  .then((result) => {
    server.listen(8721);
    console.log('connected to db and listening on port 8721');
    // Schedule monthly job: 1st day of month at 00:10 AM
    try {
      schedule.scheduleJob('10 0 1 * *', async function() {
        console.log('[Scheduler] Starting monthly payments reset...');
        try {
          await resetMonthlyPayments();
          console.log('[Scheduler] Monthly payments reset done');
        } catch (e) {
          console.error('[Scheduler] Monthly payments reset failed', e);
        }
      });
      console.log('[Scheduler] Monthly reset job scheduled: 00:10 on the 1st each month');
    } catch (e) {
      console.error('[Scheduler] Failed to schedule monthly job', e);
    }
  })
  .catch((err) => {
    console.log(err);
  });

// register view engine
app.set('view engine', 'ejs');
// listen for requests

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// let uri = ""; // Declare the 'uri' variable

app.use(
  session({
    secret: 'Keybord',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: dbURI,
    }),
  })
);

// Custom middlfsdfeware to make io accessible in all routes

// Serve the digital certificate
app.get('/assets/signing/digital-certificate.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/signing/digital-certificate.txt'));
});

app.use('/', mainRoute);
app.use('/employee', employeeRoute);

// Receive attendance events from fingerprint listener and broadcast to clients
app.post('/api/attendance', (req, res) => {
  try {
    const payload = req.body || {};
    // Expected payload: { userId: string, time: string }
    io.emit('attendance', payload);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || 'unknown error' });
  }
});

app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});

// Optional: basic connection logs
io.on('connection', (socket) => {
  // console.log('socket connected', socket.id);
});
