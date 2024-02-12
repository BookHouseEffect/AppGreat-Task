import fs from 'fs'
import postgres from 'postgres'
import AsyncLock from 'async-lock'

const fileArgv = process.argv.length >= 3 ? process.argv[2] : null
if (!fileArgv) {
    throw new Error('No file argument provided')
}

var lock = new AsyncLock()

const sql = postgres('postgres://postgres:dev@localhost:5432/postgres')

const getUserById = async (userId) => {
    const user = await sql`
        SELECT * 
        FROM users_revenue
        WHERE userId = ${ userId }
    `
    return user
}

const createUser = async (userId, revenue) => {
    await sql`
        INSERT INTO users_revenue (
            userId, revenue
        ) VALUES (
            ${userId}, ${revenue}
        )
    `
} 

const updateUserRevenue = async (userId, revenue) => {
    await sql`
        UPDATE users_revenue 
        SET revenue = ${revenue}
        WHERE userId = ${userId}
    `
}

const fileStream = fs.createReadStream(fileArgv, { encoding: 'utf-8' })

fileStream.on('error', (err) => {
    console.log(err.message)
})

fileStream.on('data', async (chunk) => {
    if (!chunk) {
        return
    }

    const events = chunk.split('\n')
        .filter(x => !!x)    
        .map(x => JSON.parse(x))

    const ev = events[0]
    events.forEach(async ev => {
        await lock.acquire("revenueLock", async () => {
            await sql.begin('read write', async sql => {
                const user = await getUserById(ev.userId)
                let newRevenue = user.length !== 0 ? user[0].revenue : 0

                if (ev.name === 'add_revenue') {
                    newRevenue += ev.value
                } else if (ev.name === 'subtract_revenue') {
                    newRevenue -= ev.value
                } else {
                    return
                }

                if (user.length !== 0) {
                    await updateUserRevenue(ev.userId, newRevenue)
                } else {
                    await createUser(ev.userId, newRevenue)
                }
            }).then(() => {
                console.log(ev.userId, "OK")
            }).catch(() => {
                console.log(ev.userId, "NOT OK")
            })
        })
    })
})
