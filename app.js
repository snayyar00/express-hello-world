const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure CORS to allow requests from your frontend
app.use(cors({
    origin: 'https://www.webability.io',
    methods: 'GET,POST',
    credentials: true
}));

const dbURI = process.env.MONGODB_URI;

mongoose.connect(dbURI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

function generateUniqueToken() {
    return crypto.randomBytes(16).toString('hex');
}

async function sendEmail(sendTo, subject, text) {
    if (!sendTo || sendTo.trim() === '') {
        console.error('Recipient email address is missing or empty.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true', // Should be true if EMAIL_PORT is 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: sendTo,
        subject: subject,
        text: text
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

app.get('/', (req, res) => res.send('Home Page Route'));

const visitorSchema = new mongoose.Schema({
    Businessname: String,
    Email: String,
    Website: String,
    Uniquetoken: String,
});

const Visitor = mongoose.model('Visitor', visitorSchema);

app.post('/form', async (req, res) => {
    const uniqueToken = generateUniqueToken();
    console.log('Received POST request for /form:', req.body.email);
    const visitorDocument = new Visitor({
        businessName: req.body.businessName,
        email: req.body.email,
        website: req.body.website,
        Uniquetoken: uniqueToken,
    });
    const emailToSend = req.body.email;
    console.log(emailToSend)
    try {
        await visitorDocument.save();
        res.send('Received POST request for /form');
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Internal Server Error');
    }

    try {
      console.log(req.body.email)
        sendEmail(req.body.email, 'Welcome to Webability', `
            <html>
            <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333333;
                }
                .script-box {
                    background-color: #f4f4f4;
                    border: 1px solid #dddddd;
                    padding: 15px;
                    overflow: auto;
                    font-family: monospace;
                    margin-top: 20px;
                    white-space: pre-wrap;
                }
                .instructions {
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <h1>Welcome to Webability!</h1>
            <p class="instructions">To get started with Webability on your website, please follow these steps:</p>
            <ol>
                <li>Copy the script code provided below.</li>
                <li>Paste it into the HTML of your website, preferably near the closing &lt;/body&gt; tag.</li>
            </ol>
            <div class="script-box">
                &lt;script src="https://webability.ca/webAbility.min.js" token="${uniqueToken}"&gt;&lt;/script&gt;
            </div>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Thank you for choosing Webability!</p>
        </body>
            </html>
        `);
    } catch (error) {
        console.error('Error sending email:', error);
    }
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
