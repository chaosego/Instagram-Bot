const puppeteer = require('puppeteer');
let cnf = require('../config/config.json');
var user = require('../src/user');
var moment = require('moment');
var request = require('request');

let doUnfollows = async function(){
    
     const browser = await puppeteer.launch({
        headless: cnf.settings.headless,
        args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    page.setViewport({width: 1200, height: 764});

    await page.goto('https://www.instagram.com/accounts/login/?source=auth_switcher');
    await page.waitFor(2500);

    await page.click(cnf.selectors.username_field);
    await page.keyboard.type(cnf.username);
    await page.keyboard.press("Tab");
    await page.keyboard.type(cnf.password);
    await page.keyboard.press("Enter");
    
    await page.waitForNavigation();
    
    var unfollowQuery = {
        '_account': cnf.username,
        'follow.following': true,
        'follow.markedArchive': false,
        'follow.bot': true
    }
    
    if(cnf.doUnfollows){
        var count = 0;
        await page.goto("https://www.instagram.com/"+cnf.username);
        await page.click(cnf.selectors.following_link);
        await page.waitFor(2500);
        for(var i = 1; count <= cnf.noOfUnfollows; i++){
            try{
            await page.waitFor(cnf.unfollowWaitTime);
            await page.click("body > div:nth-child(15) > div > div > div.isgrP > ul > div > li:nth-child("+i+") > div > div.Pkbci > button");
            let username = await page.evaluate(x => {
                let element = document.querySelector(x);
                return Promise.resolve(element ? element.innerHTML : '');
            }, cnf.selectors.unfollow_username);
            var findUser = username.substring(
                username.lastIndexOf("@") + 1, 
                username.lastIndexOf("?")
            );
            unfollowQuery.username = findUser;
            var thisUser = user.findOne(unfollowQuery, {})
                .exec(function(error, thisUser){
                    console.log(unfollowQuery);
                    if(!error && thisUser){
                        var followDate = new Date(thisUser.follow.followedAt);
                        var unFollowDate = new Date();
                        unFollowDate.setDate(followDate.getDate() + cnf.unfollowAfterDays);
                        if(unFollowDate <= new Date()){
                            count++;
                            page.click(cnf.selectors.confirm_unfollow_button).catch();
                            thisUser.follow.following = false;
                            thisUser.follow.markedArchive = true;
                            thisUser.follow.archivedAt = moment();
                            thisUser.save(function (err, thisUser) {
                                if (err) {
                                    return console.error(err);
                                }else{
                                   console.log("------ Unfollowed user: " + thisUser);
                                }
                            });
                        }else{
                            console.log("Time not expired: " + findUser);
                        }
                    }else{
                        if(error)
                            console.log("Database error: " + error);
                        else{
                            console.log("User not unfollowed: " + findUser);
                            page.click(cnf.selectors.cancel_unfollow_button);
                        }
                    }
                })
            }catch(e){
                await page.keyboard.press("Escape");
                break;
            }
        }
        await page.keyboard.press("Escape");
    }
    
    return browser.close();
    
}

let exploreHashTags = async function(){
    
    const browser = await puppeteer.launch({
        headless: cnf.settings.headless,
        args: ['--no-sandbox']
    });
    var newtags = [];
    /*newtags = await refineHashTags(newtags, function(error, newtags){
        console.log("I am here");
        console.log(newtags);
    });*/
    
    var existing = [];
    var hash = user.find({_account: cnf.username, hashtag: {$in: cnf.hashTags}, _created: {$gte: moment().startOf('day')}},{hashtag: 1}).exec(async function(error, hash){
        //console.log(hash);
        if(!error && hash){
            hash.forEach(function(thisHash, hIndex){
                existing.push(thisHash.hashtag);
            })
            for(var i = 0; i < cnf.hashTags.length; i++){
                if(existing.indexOf(cnf.hashTags[i]) == -1)
                    newtags.push(cnf.hashTags[i]);
            }
        }else{
            newtags = cnf.hashTags;
        }
        //console.log(newtags);
        
        const page = await browser.newPage();
        page.setViewport({width: 1200, height: 764});
        console.log("Opening Instagram");
        await page.goto('https://www.instagram.com/accounts/login/?source=auth_switcher');
        await page.waitFor(2500);

        await page.click(cnf.selectors.username_field);
        await page.keyboard.type(cnf.username);
        await page.keyboard.press("Tab");
        await page.keyboard.type(cnf.password);
        await page.keyboard.press("Enter");
        console.log("Logging in...");
        await page.waitForNavigation();

        if(cnf.exploreHashTags){
            console.log("Exploring hashtags");
            for(var i = 0; i < newtags.length; i++){
                await page.goto('https://www.instagram.com/explore/tags/' + newtags[i] + '/?hl=en');
                if(cnf.topPosts){
                    for(var row = 1; row <= 3; row++){
                        for(var col = 1; col <= 3; col++){
                            try{
                                await page.click("#react-root > section > main > article > div.EZdmt > div > div > div:nth-child("+row+") > div:nth-child("+col+") > a > div");

                                await page.waitFor(5000);
                                let username = await page.evaluate(x => {
                                    let element = document.querySelector(x);
                                    return Promise.resolve(element ? element.innerHTML : '');
                                }, cnf.selectors.post_username);

                                if(cnf.doLike){
                                    var alreadyLiked = await page.$(cnf.selectors.unLikeSpan);
                                    if(alreadyLiked == null)
                                        await page.click(cnf.selectors.likeButton);
                                }

                                if(cnf.doFollow){
                                    var thisUser = user.findOne({username: username, _account: cnf.username},{})
                                        .exec(function(error, thisUser){
                                            if(!error){
                                                if(thisUser){
                                                    console.log("Already followed!");
                                                    console.log("Username: " + username);
                                                    console.log("Following since: " + moment(new Date(thisUser.follow.followedAt)).format("DD-MMM-YYYY"));
                                                }else{
                                                    page.click(cnf.selectors.followButton).then(function(){
                                                        var alreadyFollowing = page.$(cnf.selectors.alreadyFollowingButton);
                                                        alreadyFollowing.then(function(result){
                                                            if(result === null){
                                                                var newUser = new user({
                                                                    username: username,
                                                                    hashtag: newtags[i],
                                                                    follow: {
                                                                        following: true,
                                                                        followedAt: moment(),
                                                                        markedArchive: false,
                                                                        bot: true
                                                                    }
                                                                })
                                                                newUser.save(function (err, newUser) {
                                                                    if (err) {
                                                                        return console.error(err);
                                                                    }else{
                                                                       console.log("------ Added user: " + newUser);
                                                                    }
                                                                });
                                                            }else{
                                                                var newUser = new user({
                                                                    username: username,
                                                                    hashtag: newtags[i],
                                                                    follow: {
                                                                        following: true,
                                                                        followedAt: moment(),
                                                                        markedArchive: false,
                                                                        bot: false
                                                                    }
                                                                })
                                                                newUser.save(function (err, newUser) {
                                                                    if (err) {
                                                                        return console.error(err);
                                                                    }else{
                                                                       console.log("------ Added already following user: " + newUser);
                                                                    }
                                                                });
                                                            }
                                                        })
                                                    }).catch(function(){
                                                        console.log("Error following!");
                                                    });
                                                }
                                            }else
                                                console.log("Error: " + error);
                                        })
                                    }
                                await page.waitFor(5000);
                                await page.waitFor(cnf.timebetweenfollows);
                                await page.goBack();
                            }catch(e){
                                continue;
                            }
                        }
                    }
                }
                for(var row = 1; row <= cnf.rows; row++){
                    for(var col = 1; col <= 3; col++){
                        try{
                        await page.click("#react-root > section > main > article > div:nth-child(4) > div > div:nth-child("+row+") > div:nth-child("+col+") > a > div");
                            await page.waitFor(5000);
                        let username = await page.evaluate(x => {
                                let element = document.querySelector(x);
                                return Promise.resolve(element ? element.innerHTML : '');
                            }, cnf.selectors.post_username);
                        if(cnf.doLike){
                            var alreadyLiked = await page.$(cnf.selectors.unLikeSpan);
                            if(alreadyLiked == null)
                                await page.click(cnf.selectors.likeButton);
                        }
                        if(cnf.doFollow){
                            var thisUser = user.findOne({username: username, _account: cnf.username},{})
                                .exec(function(error, thisUser){
                                    if(!error){
                                        if(thisUser){
                                            console.log("Already followed!");
                                            console.log("Username: " + username);
                                            console.log("Following since: " + moment(new Date(thisUser.follow.followedAt)).format("DD-MMM-YYYY"));
                                        }else{
                                            page.click(cnf.selectors.followButton).then(function(){
                                                var alreadyFollowing = page.$(cnf.selectors.alreadyFollowingButton);
                                                alreadyFollowing.then(function(result){
                                                    if(result === null){
                                                        var newUser = new user({
                                                            username: username,
                                                            hashtag: newtags[i],
                                                            follow: {
                                                                following: true,
                                                                followedAt: moment(),
                                                                markedArchive: false,
                                                                bot: true
                                                            }
                                                        })
                                                        newUser.save(function (err, newUser) {
                                                            if (err) {
                                                                return console.error(err);
                                                            }else{
                                                               console.log("------ Added user: " + newUser);
                                                            }
                                                        });
                                                    }else{
                                                        var newUser = new user({
                                                            username: username,
                                                            hashtag: newtags[i],
                                                            follow: {
                                                                following: true,
                                                                followedAt: moment(),
                                                                markedArchive: false,
                                                                bot: false
                                                            }
                                                        })
                                                        newUser.save(function (err, newUser) {
                                                            if (err) {
                                                                return console.error(err);
                                                            }else{
                                                               console.log("------ Added already following user: " + newUser);
                                                            }
                                                        });
                                                    }
                                                })
                                            }).catch(function(){
                                                console.log("Error following!");
                                            });
                                        }
                                    }else
                                        console.log("Error: " + error);
                                })
                        }
                        await page.waitFor(5000);
                        await page.waitFor(cnf.timebetweenfollows);
                        await page.goBack();
                        }catch(e){
                            continue;
                        }
                    }
                }
            }
        }
        return browser.close();
        
        
        
    });
    
    
    
    
    
}

let exploreUsers = async function(){
    
    const browser = await puppeteer.launch({
        headless: cnf.settings.headless,
        args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    page.setViewport({width: 1200, height: 764});

    await page.goto('https://www.instagram.com/accounts/login/?source=auth_switcher');
    await page.waitFor(2500);

    await page.click(cnf.selectors.username_field);
    await page.keyboard.type(cnf.username);
    await page.keyboard.press("Tab");
    await page.keyboard.type(cnf.password);
    await page.keyboard.press("Enter");
    
    await page.waitForNavigation();
    
    if(cnf.exploreUsers){
        for(var i = 0; i < cnf.usersToFollow.length; i++){
            await page.goto('https://www.instagram.com/' + cnf.usersToFollow[i]);
            if(cnf.profileFollow)
               await page.click(cnf.selectors.profilePageFollowButton)
            if(cnf.likeAllPics){
                var hasMore = true;
                var row = 1;
                while(hasMore){
                    for(var col = 1; col <= 3; col++){
                        var liked = false;
                        await page.click("#react-root > section > main > div > div._2z6nI > article > div > div > div:nth-child("+row+") > div:nth-child("+col+") > a").catch(() => { hasMore = false; });
                        if(!hasMore)
                            break;
                        await page.waitFor(2500);
                        await page.click(cnf.selectors.likeButton).catch(() => { liked = true; });
                        if(liked)
                            continue;
                        await page.goBack();
                    }
                    row++;
                }
            }
        }
    }
     
    return browser.close();
    
}

module.exports.doUnfollows = doUnfollows;
module.exports.exploreHashTags = exploreHashTags;
module.exports.exploreUsers = exploreUsers;
