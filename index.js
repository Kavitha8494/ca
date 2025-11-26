const express = require('express');
const cors = require('cors')
const referrerPolicy = require('referrer-policy')
const socketIO = require('socket.io');
const http = require('http');
const Net = require('net');
const nodeCron = require("node-cron");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./config/db');

// create express app
const app = express();
const router = express.Router();

//.env setup
const dotenv = require('dotenv');
dotenv.config();

const bodyParser = require('body-parser');     //url-encoded
const bcrypt = require('bcryptjs');        //Password Hashing
const jwt = require('jsonwebtoken');       //JSON Web Token
const cookieParser = require('cookie-parser'); //Cookie session
const session = require('express-session');    //Session
const flash = require('connect-flash');      //Flash




const port = process.env.PORT || 3001;       // Setup server port
const uploadsRoot = path.join(__dirname, 'uploads');
const resumeUploadDir = path.join(uploadsRoot, 'resumes');
fs.mkdirSync(resumeUploadDir, { recursive: true });
const allowedResumeExtensions = ['.pdf', '.doc', '.docx'];
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resumeUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/[^\w-]/g, '').substring(0, 40) || 'resume';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});
const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedResumeExtensions.includes(ext)) {
      const error = new Error('Only .pdf, .doc, and .docx files are allowed');
      error.code = 'UNSUPPORTED_FILE_TYPE';
      return cb(error);
    }
    cb(null, true);
  }
});

const removeFileIfExists = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.warn('Failed to remove file:', filePath, err.message);
    }
  });
};
app.use(bodyParser.urlencoded({ extended: true }));  // parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.json());               // parse requests of content-type - application/json

app.use(cors());

// Referrer-Policy: same-origin
app.use(referrerPolicy({ policy: 'same-origin' }));


app.use(flash());

// Session configuration
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

//setting all files view as .ejs
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use('/fa', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free'));


const nDate = new Date().toLocaleString('en-US', {
  timeZone: 'Asia/Calcutta'
});

const validateContactPayload = (payload = {}) => {
  const errors = {};
  const fullName = (payload.name || '').trim();
  const email = (payload.email || '').trim();
  const phone = (payload.phone || '').trim();
  const message = (payload.message || '').trim();

  if (!fullName) {
    errors.name = 'Name is required';
  } else if (fullName.length < 2 || fullName.length > 100) {
    errors.name = 'Name must be between 2 and 100 characters';
  }

  if (!email) {
    errors.email = 'Email is required';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = 'Enter a valid email';
    }
  }

  if (!phone) {
    errors.phone = 'Phone number is required';
  } else {
    const numericPhone = phone.replace(/[^0-9+]/g, '');
    if (numericPhone.length < 10 || numericPhone.length > 20) {
      errors.phone = 'Phone number should be 10-20 digits';
    } else if (!/^\+?\d+$/.test(phone)) {
      errors.phone = 'Only digits and optional leading + allowed';
    }
  }

  if (!message) {
    errors.message = 'Message is required';
  } else if (message.length < 10) {
    errors.message = 'Message should be at least 10 characters';
  } else if (message.length > 2000) {
    errors.message = 'Message should be shorter than 2000 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: { fullName, email, phone, message }
  };
};

const validateCareerPayload = (payload = {}) => {
  const errors = {};
  const sanitized = {
    firstName: (payload.firstName || '').trim(),
    lastName: (payload.lastName || '').trim(),
    email: (payload.email || '').trim(),
    mobileNumber: (payload.mobileNumber || '').trim(),
    gender: (payload.gender || '').trim().toUpperCase(),
    position: (payload.position || '').trim(),
    dob: (payload.dob || '').trim(),
    qualification: (payload.qualification || '').trim(),
    website: (payload.website || '').trim(),
    lastCompanyName: (payload.lastCompanyName || '').trim(),
    yearOfExperienceYear: (payload.yearOfExperienceYear || '').toString().trim(),
    yearOfExperienceMonth: (payload.yearOfExperienceMonth || '').toString().trim(),
    reference: (payload.reference || '').trim()
  };

  const nameValidator = (value, field, label) => {
    if (!value) {
      errors[field] = `${label} is required`;
    } else if (value.length < 2) {
      errors[field] = `${label} must be at least 2 characters`;
    } else if (value.length > 60) {
      errors[field] = `${label} must be under 60 characters`;
    }
  };

  nameValidator(sanitized.firstName, 'firstName', 'First name');
  nameValidator(sanitized.lastName, 'lastName', 'Last name');

  if (!sanitized.email) {
    errors.email = 'Email is required';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized.email)) {
      errors.email = 'Enter a valid email address';
    }
  }

  if (!sanitized.mobileNumber) {
    errors.mobileNumber = 'Mobile number is required';
  } else {
    const digitsOnly = sanitized.mobileNumber.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      errors.mobileNumber = 'Mobile number must be 10-15 digits';
    }
  }

  const allowedGenders = ['MALE', 'FEMALE'];
  if (!sanitized.gender || !allowedGenders.includes(sanitized.gender)) {
    errors.gender = 'Please select gender';
  }

  if (!sanitized.position) {
    errors.position = 'Position is required';
  } else if (sanitized.position.length < 2) {
    errors.position = 'Position must be at least 2 characters';
  }

  if (!sanitized.dob) {
    errors.dob = 'Date of birth is required';
  } else {
    const dobDate = new Date(sanitized.dob);
    if (Number.isNaN(dobDate.getTime())) {
      errors.dob = 'Enter a valid date of birth';
    } else {
      const today = new Date();
      if (dobDate > today) {
        errors.dob = 'Date of birth cannot be in the future';
      }
    }
  }

  if (!sanitized.qualification) {
    errors.qualification = 'Qualification is required';
  } else if (sanitized.qualification.length < 2) {
    errors.qualification = 'Qualification must be at least 2 characters';
  }

  if (sanitized.website) {
    try {
      const normalizedUrl = new URL(sanitized.website);
      if (!normalizedUrl.protocol.startsWith('http')) {
        errors.website = 'Website must use http or https';
      }
    } catch (e) {
      errors.website = 'Enter a valid website URL (include http/https)';
    }
  }

  if (!sanitized.lastCompanyName) {
    errors.lastCompanyName = 'Last company name is required';
  } else if (sanitized.lastCompanyName.length < 2) {
    errors.lastCompanyName = 'Last company name must be at least 2 characters';
  }

  const expYear = parseInt(sanitized.yearOfExperienceYear, 10);
  if (Number.isNaN(expYear)) {
    errors.yearOfExperienceYear = 'Years of experience is required';
  } else if (expYear < 0 || expYear > 50) {
    errors.yearOfExperienceYear = 'Years of experience must be between 0 and 50';
  } else {
    sanitized.yearOfExperienceYear = expYear;
  }

  const expMonth = parseInt(sanitized.yearOfExperienceMonth, 10);
  if (Number.isNaN(expMonth)) {
    errors.yearOfExperienceMonth = 'Months of experience is required';
  } else if (expMonth < 0 || expMonth > 11) {
    errors.yearOfExperienceMonth = 'Months of experience must be between 0 and 11';
  } else {
    sanitized.yearOfExperienceMonth = expMonth;
  }

  if (sanitized.reference && sanitized.reference.length < 5) {
    errors.reference = 'Reference must be at least 5 characters when provided';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
};

const validateQueryPayload = (payload = {}) => {
  const errors = {};
  const sanitized = {
    name: (payload.name || '').trim(),
    designation: (payload.designation || '').trim(),
    organization: (payload.organization || '').trim(),
    officeAddress: (payload.officeAddress || '').trim(),
    city: (payload.city || '').trim(),
    email: (payload.email || '').trim(),
    telephoneNo: (payload.telephoneNo || '').trim(),
    mobileNo: (payload.mobileNo || '').trim(),
    otherProfessional: (payload.otherProfessional || '').trim().toUpperCase(),
    subjectQuery: (payload.subjectQuery || '').trim(),
    queryText: (payload.queryText || '').trim()
  };

  if (!sanitized.name) {
    errors.name = 'Name is required';
  } else if (sanitized.name.length < 2 || sanitized.name.length > 100) {
    errors.name = 'Name must be between 2 and 100 characters';
  }

  if (sanitized.designation && sanitized.designation.length > 100) {
    errors.designation = 'Designation must be under 100 characters';
  }

  if (sanitized.organization && sanitized.organization.length > 150) {
    errors.organization = 'Organization must be under 150 characters';
  }

  if (sanitized.officeAddress && sanitized.officeAddress.length > 255) {
    errors.officeAddress = 'Office address must be under 255 characters';
  }

  if (!sanitized.city) {
    errors.city = 'City is required';
  } else if (sanitized.city.length < 2 || sanitized.city.length > 100) {
    errors.city = 'City must be between 2 and 100 characters';
  }

  if (!sanitized.email) {
    errors.email = 'Email is required';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized.email)) {
      errors.email = 'Enter a valid email address';
    }
  }

  if (sanitized.telephoneNo) {
    const telNormalized = sanitized.telephoneNo.replace(/[^0-9+]/g, '');
    if (!/^\+?\d+$/.test(telNormalized)) {
      errors.telephoneNo = 'Telephone number must contain only digits and optional leading +';
    } else if (telNormalized.length < 6 || telNormalized.length > 20) {
      errors.telephoneNo = 'Telephone number must be between 6 and 20 digits';
    }
  }

  if (!sanitized.mobileNo) {
    errors.mobileNo = 'Mobile number is required';
  } else {
    const mobNormalized = sanitized.mobileNo.replace(/[^0-9+]/g, '');
    if (!/^\+?\d+$/.test(mobNormalized)) {
      errors.mobileNo = 'Mobile number must contain only digits and optional leading +';
    } else if (mobNormalized.length < 10 || mobNormalized.length > 20) {
      errors.mobileNo = 'Mobile number must be between 10 and 20 digits';
    }
  }

  const allowedOtherProfessional = ['YES', 'NO'];
  if (!sanitized.otherProfessional) {
    errors.otherProfessional = 'Please select if you want other professional updates';
  } else if (!allowedOtherProfessional.includes(sanitized.otherProfessional)) {
    errors.otherProfessional = 'Invalid value for other professional updates';
  }

  if (!sanitized.subjectQuery) {
    errors.subjectQuery = 'Subject of query is required';
  }

  if (!sanitized.queryText) {
    errors.queryText = 'Query is required';
  } else if (sanitized.queryText.length < 10) {
    errors.queryText = 'Query must be at least 10 characters';
  } else if (sanitized.queryText.length > 4000) {
    errors.queryText = 'Query must be under 4000 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
};

// Routes
app.get("/", (req, res) => {
  res.render("index", { title: "My Home Page" });
});

app.get("/careers", (req, res) => {
  res.render("careers", { title: "Careers" });
});

app.get("/contact-us", (req, res) => {
  res.render("contact-us", { title: "Contact Us" });
});

app.get("/about-us", (req, res) => {
  res.render("about-us", { title: "About Us" });
});
app.get("/news", (req, res) => {
  res.render("news", { title: "News" });
});
app.get("/disclaimer", (req, res) => {
  res.render("disclaimer", { title: "Disclaimer" });
});
app.get("/Services/audit-and-assurance", (req, res) => {
  res.render("audit-and-assurance", { title: "Audit and Assurance" });
});

app.get("/query", (req, res) => {
  res.render("query", { title: "Query" });
});


// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

app.post('/api/contact', async (req, res) => {
  try {
    const { isValid, errors, sanitized } = validateContactPayload(req.body);
    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }

    await db.execute(
      `INSERT INTO contact_submissions (FULL_NAME, EMAIL, PHONE, MESSAGE) VALUES (?, ?, ?, ?)`,
      [sanitized.fullName, sanitized.email, sanitized.phone, sanitized.message]
    );

    return res.json({
      success: true,
      message: 'Thanks for reaching out! We will get back to you shortly.'
    });
  } catch (error) {
    console.error('Failed to submit contact request:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to submit request right now. Please try again later.'
    });
  }
});

app.post('/api/careers', (req, res) => {
  resumeUpload.single('resume')(req, res, async (err) => {
    if (err) {
      let status = 400;
      let body = {
        success: false,
        errors: {
          resume: 'Unable to upload resume. Please try again.'
        }
      };

      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        body.errors.resume = 'Resume must be 1MB or smaller';
      } else if (err.code === 'UNSUPPORTED_FILE_TYPE') {
        body.errors.resume = 'Only PDF, DOC, and DOCX files are allowed';
      } else if (!(err instanceof multer.MulterError)) {
        status = 500;
        body = {
          success: false,
          message: 'Unexpected error while uploading resume. Please retry.'
        };
      }

      return res.status(status).json(body);
    }

    const { isValid, errors, sanitized } = validateCareerPayload(req.body);

    if (!req.file) {
      errors.resume = 'Resume is required';
    }

    if (!isValid || Object.keys(errors).length > 0) {
      removeFileIfExists(req.file?.path);
      return res.status(400).json({ success: false, errors });
    }

    try {
      const storedPath = `uploads/resumes/${req.file.filename}`;
      await db.execute(
        `INSERT INTO careers (
          FIRST_NAME,
          LAST_NAME,
          EMAIL,
          MOBILE_NUMBER,
          GENDER,
          POSITION,
          DOB,
          QUALIFICATION,
          WEBSITE,
          RESUME_FILE,
          LAST_COMPANY_NAME,
          YEAR_OF_EXPERIENCE_YEAR,
          YEAR_OF_EXPERIENCE_MONTH,
          REFERENCE
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sanitized.firstName,
          sanitized.lastName,
          sanitized.email,
          sanitized.mobileNumber,
          sanitized.gender,
          sanitized.position,
          sanitized.dob,
          sanitized.qualification,
          sanitized.website || null,
          storedPath,
          sanitized.lastCompanyName,
          sanitized.yearOfExperienceYear,
          sanitized.yearOfExperienceMonth,
          sanitized.reference || null
        ]
      );

      return res.json({
        success: true,
        message: 'Thank you for applying. Our team will connect with you soon.'
      });
    } catch (dbError) {
      console.error('Failed to save career application:', dbError);
      removeFileIfExists(req.file?.path);
      return res.status(500).json({
        success: false,
        message: 'Unable to submit application right now. Please try again later.'
      });
    }
  });
});

app.post('/api/query', async (req, res) => {
  try {
    const { isValid, errors, sanitized } = validateQueryPayload(req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    await db.execute(
      `INSERT INTO query (
        NAME,
        DESIGNATION,
        ORGANIZATION,
        OFFICE_ADDRESS,
        CITY,
        EMAIL,
        TELEPHONE_NO,
        MOBILE_NO,
        OTHER_PROFESSIONAL,
        SUBJECT_QUERY,
        QUERY
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sanitized.name,
        sanitized.designation || null,
        sanitized.organization || null,
        sanitized.officeAddress || null,
        sanitized.city,
        sanitized.email,
        sanitized.telephoneNo || null,
        sanitized.mobileNo,
        sanitized.otherProfessional,
        sanitized.subjectQuery,
        sanitized.queryText
      ]
    );

    return res.json({
      success: true,
      message: 'Your query has been submitted successfully. Our team will get back to you soon.'
    });
  } catch (error) {
    console.error('Failed to submit query:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to submit query right now. Please try again later.'
    });
  }
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).send('Page not found');
})

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

