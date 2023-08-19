/* eslint-disable object-curly-spacing */
const {onRequest} = require("firebase-functions/v2/https");
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');


// google cloud secret manager
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const projectName = 'showcalAPI';


// eslint-disable-next-line require-jsdoc
async function getSecret(secretName) {
  try {
    const [version] = await client.accessSecretVersion({
      name: `projects/${projectName}/secrets/${secretName}/versions/latest`,
    });
    return version.payload.data.toString();
  } catch (error) {
    console.error(`Failed to retrieve secret: ${secretName}`, error);
    throw new Error(`Failed to retrieve secret: ${secretName}`);
  }
}


// Initialize express app
const app = express();
app.use(cors());
app.use(express.json());

let CREDENTIALS;
let auth;

(async () => {
  try {
    const cred = await getSecret('showCal-credentials');
    CREDENTIALS = JSON.parse(cred);

    auth = new google.auth.JWT(
        CREDENTIALS.client_email,
        null,
        CREDENTIALS.private_key,
        SCOPES,
    );
  } catch (error) {
    console.error(`Error initalizing app credentials and auth:`, error);
  }
})();


const calendar = google.calendar({ version: "v3" });

const calendarId = "8aeeql20in6th1kdmgvhojqdqo@group.calendar.google.com";


const getEvents = async (dateTimeStart, dateTimeEnd) => {
  try {
    const response = await calendar.events.list({
      auth: auth,
      calendarId: calendarId,
      timeMin: dateTimeStart.toISOString(),
      timeMax: dateTimeEnd.toISOString(),
      singleEvents: true,
      timeZone: 'America/Los_Angeles',
    });

    const items = response['data']['items'];
    return items;
  } catch (error) {
    console.error(`Error at getEvents --> ${error}`);
    return null;
  }
};

// event route

app.get('/events', async (req, res) => {
  if (!auth) {
    // eslint-disable-next-line max-len
    return res.status(500).send('Server is not properly initialized. Try again later.');
  }
  try {
    const start = (new Date()).toISOString();
    const end = '2099-08-02T00:58:00.000Z';
    const results = await getEvents(start, end);
    console.log(results);
    res.send(results);
  } catch (error) {
    console.error(`Error at express route --> ${error}`);
    res.status(500).send('There was an error retrieving the events');
  }
});

// function parseDateFromDay(ymdStr) {
//     return new Date(ymdStr);
// }

app.get('/events/:startDay/:endDay', async (req, res) => {
  if (!auth) {
    // eslint-disable-next-line max-len
    return res.status(500).send('Server is not properly initialized. Try again later.');
  }
  let start; let end;
  try {
    start = new Date(req.params.startDay);
    start.setHours(0, 0, 0, 0);

    end = new Date(req.params.endDay);
    end.setHours(23, 59, 59, 999);
  } catch (err) {
    console.error(err);
    res.status(400).send({ error: 'Bad start or end day' });
    return;
  }
  let results;
  try {
    results = await getEvents(start, end);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'An internal error occurred' });
    return;
  }
  res.send(results);
});

// Export your Express app as a function for Firebase Functions
exports.app = onRequest(app);


