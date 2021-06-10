const express = require('express')
const app = express()
const port = 1997

app.use('/' , express.static('website'))
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
    


