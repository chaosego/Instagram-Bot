let mongoose = require('mongoose');
const server = 'localhost:27017';
const database = 'instagram';
class Database {
  constructor() {
    this._connect()
  }
_connect() {
    
        mongoose.connect(`mongodb://${server}/${database}`)
        .then(() => {
            console.log('Database localhost connection successful')
        })
        .catch(err => {
            console.error('Database localhost connection error')
       })
  }
}
module.exports = new Database()