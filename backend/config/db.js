const mysql = require('mysql2');

const db = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:"Shivansh@21",
    database:'hotwax',
    authPlugins: {
        mysql_clear_password: () => () => Buffer.from('Shivansh@21')
    }
})



module.exports ={db}