import fs from 'fs'
import axios from 'axios'

fs.readFile('events.jsonl', { encoding: 'utf-8' }, (err, data) => {
  if (err) {
    console.log("Error has occured")
  }

  if (!data) {
    console.log("No data found")
  }

  const eventList = data.split('\r\n').map(x => JSON.parse(x))
  
  eventList.forEach((event) => {
    axios.post(
      'http://localhost:8000/liveEvent',
      JSON.stringify(event),
      {
        headers: {
          Authorization: 'secret',
          'Content-Type': 'application/json;charset=utf-8'
        }
      }).then((res) => {
        console.log(event, res.status, res.statusText)
      }).catch((err) => {
        console.log(err)
      })
  })
})