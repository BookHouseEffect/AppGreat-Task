import express from 'express'
import bodyParser from 'body-parser'
import fs from 'fs'
import postgres from 'postgres'

const app = express()
app.use(bodyParser.json())

const sql = postgres('postgres://postgres:dev@localhost:5432/postgres')

const getUserById = async (userId) => {
    const user = await sql`
        SELECT * 
        FROM users_revenue
        WHERE userId = ${ userId }
    `
    return user
}

app.post('/liveEvent', (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        res.sendStatus(401)
        return
    }

    if (authHeader !== 'secret') {
        res.sendStatus(403)
        return
    }

    next()
}, (req, res) => {
    const event = req.body

    const content = `${JSON.stringify(event)}\n`
    fs.appendFile('server-events.jsonl', content, (err) => {
        if (err) {
            console.log(err.message)
        }
    })

    res.sendStatus(204)
})

app.get('/userEvents/:userId', async (req, res) => {
    const userId = req.params.userId
    console.log(userId)

    let user = await getUserById(userId)
    if (!user.length) {
        res.json(null)
    } else {
        res.json(user[0])
    }
})

const port = 8000
app.listen(port)
console.log(`The application is running on port ${port}`)