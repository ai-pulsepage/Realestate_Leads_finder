// Google Calendar Integration

const { google } = require('googleapis');

const calendar = google.calendar({ version: 'v3' });

async function addAppointment(auth, summary, startTime, endTime) {
  const event = {
    summary,
    start: { dateTime: startTime },
    end: { dateTime: endTime }
  };
  const res = await calendar.events.insert({
    auth,
    calendarId: 'primary',
    resource: event
  });
  return res.data;
}

module.exports = { addAppointment };