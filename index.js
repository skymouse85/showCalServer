import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';


//initialize express app
const app = express();
app.use(cors());
app.use(express.json());



// Provide the required configuration
const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);
const calendarId = process.env.CALENDAR_ID;

// Google calendar API settings
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const calendar = google.calendar({version : "v3"});

const auth = new google.auth.JWT(
    CREDENTIALS.client_email,
    null,
    CREDENTIALS.private_key,
    SCOPES
);

// Your TIMEOFFSET Offset
const TIMEOFFSET = '-08:00';


// Get all the events between two dates


const getEvents = async (dateTimeStart, dateTimeEnd) => {
    try {
        let response = await calendar.events.list({
            auth: auth,
            calendarId: calendarId,
            timeMin: dateTimeStart.toISOString(),
            timeMax: dateTimeEnd.toISOString(),
            singleEvents: true,
            timeZone: 'America/Los_Angeles'
        });
    
        let items = response['data']['items'];
        return items;
    } catch (error) {
        console.error("Error at getEvents:", error);
        return null;
    }
};





app.get('/events', async (req, res) => {
    try {
        let start = (new Date()).toISOString();
        let end = '2099-08-02T00:58:00.000Z';
        const results = await getEvents(start, end);
        console.log(results);
        res.send(results);
    } catch (error) {
        console.log(`Error at express route --> ${error}`);
        res.status(500).send('An error occurred');
    }
});


function parseDateFromDay(ymdStr) {
    return new Date(ymdStr);
}

// GET /events/2023-06-28/2023-11-22
app.get('/events/:startDay/:endDay', async (req, res) => {
    let start, end
    try {
        start = new Date(req.params.startDay);
        start.setHours(0, 0, 0, 0); // start of the day

        end = new Date(req.params.endDay);
        end.setHours(23, 59, 59, 999); // end of the day
    } catch (err) {
        console.error(err)
        res.status(400).send({error: 'Bad start or end day'})
        return
    }
    let results
    try {
        results = await getEvents(start, end)
    } catch (error) {
        console.error(error)
        res.status(500).send({error: 'An internal error occurred'})
        return
    }
    res.send(results)
})
app.listen(8080, () => console.log('listening on port http://localhost:8080'));





