const express = require('express');
const cors = require('cors');
const http = require('http');
const {db} = require('./config/db');
const routes = require('./routes/index');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/',routes);

const server = http.createServer(app);

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

server.listen(8081,()=>{
    console.log("listning");
})