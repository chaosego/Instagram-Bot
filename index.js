let database = require('./src/database');
let bot = require('./src/puppeteer');
var schedule = require('node-schedule');
let cnf = require('./config/config.json');

var unfollow = schedule.scheduleJob('* * * *', function(){
  bot.doUnfollows();
});

var exploreHashTags = schedule.scheduleJob('* * * *', function(){
  bot.exploreHashTags();
});