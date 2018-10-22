let database = require('./src/database');
let bot = require('./src/puppeteer');
var schedule = require('node-schedule');
let cnf = require('./config/config.json');

var unfollow = schedule.scheduleJob('0 0 0 * * *', function(){
  bot.doUnfollows();
});

var exploreHashTags = schedule.scheduleJob('0 0 * * * *', function(){
  bot.exploreHashTags();
});