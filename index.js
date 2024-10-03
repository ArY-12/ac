//    "ocrSpaceApiKey": "K84184401288957",

const Discord = require("discord.js-selfbot-v13")
const client = new Discord.Client({
    checkUpdate: false
});
const express = require('express');
const {
    solveHint,
    checkRarity
} = require("pokehint")
const {
    ocrSpace
} = require('ocr-space-api-wrapper');

const config = require('./config.json')
const json = require('./namefix.json');
const allowedChannels = []; // Add your allowed channel IDs to this array or leave it like [] if you want to it to catch from all channels
let isSleeping = false;


//------------------------- KEEP-ALIVE--------------------------------//

const app = express();
if (Number(process.version.slice(1).split(".")[0]) < 8) throw new Error("Node 8.0.0 or higher is required. Update Node on your system.");
app.get("/", (req, res) => {
    res.status(200).send({
        success: "true"
    });
});
app.listen(process.env.PORT || 3000);

//--------------------------------------------------------------//

//-------------------------SOME EXTRA FUNCTIONS----------------------------//


function findOutput(input) {
    if (json.hasOwnProperty(input)) {
        return json[input];
    } else {
        return input;
    }
}


function checkSpawnsRemaining(string) {
    const match = string.match(/Spawns Remaining: (\d+)/);
    if (match) {
        const spawnsRemaining = parseInt(match[1]);
        console.log(spawnsRemaining)
    }
}
//--------------------------------------------------------------------------//

//-------------------------READY HANDLER+SPAMMER-----------------------//

client.on('ready', () => {
    console.log("ugly");
    console.log(`Account: ${client.user.username} is ONLINE, `);
    console.log("Note: When using Incense, ensure it occurs in a separate channel where hint bots like pokename/sierra aren't enabled to send messages!");
    console.log("Use $help to know about commands");

    // Get the spam channel from config
    const channel = client.channels.cache.get(config.spamChannelID);

    // Check if the channel is found
    if (!channel) {
        console.error("Spam channel not found. Please check the spamChannelID in config.json.");
        return; // Exit if channel not found
    }

    // Function to generate a random interval for spamming
    function getRandomInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Function to send spam messages
    function spam() {
        const result = Math.random().toString(36).substring(2, 15); // Generate a random string
        channel.send(result + "(hello)").catch(error => {
            console.error("Failed to send spam message:", error); // Log any errors
        });

        const randomInterval = getRandomInterval(1500, 5000); // Random interval between 1.5 seconds and 5 seconds
        setTimeout(spam, randomInterval); // Call spam again after the random interval
    }

    // Start spamming
    spam();
});

//------------------------------------------------------------//


//-------------------------Anti-Crash-------------------------//

process.on("unhandledRejection", (reason, p) => {
    if (reason == "Error: Unable to identify that pokemon.") {} else {
        console.log(" [antiCrash] :: Unhandled Rejection/Catch");
        console.log(reason, p);
    }
});
process.on("uncaughtException", (err, origin) => {
    console.log(" [antiCrash] :: Uncaught Exception/Catch");
    console.log(err, origin);
});
process.on("uncaughtExceptionMonitor", (err, origin) => {
    console.log(" [antiCrash] :: Uncaught Exception/Catch (MONITOR)");
    console.log(err, origin);
});
process.on("multipleResolves", (type, promise, reason) => {
    console.log(" [antiCrash] :: Multiple Resolves");
    console.log(type, promise, reason);
});

//------------------------------------------------------------//

//----------------------------AUTOCATCHER--------------------------------------//

client.on('messageCreate', async message => {
    if (message.content === "$captcha_completed" && message.author.id === config.OwnerID) {
        isSleeping = false;
        message.channel.send("Autocatcher Started!")
    }

    if (message.content === "$help" && message.author.id === config.OwnerID) {

        await message.channel.send(
            "``` $captcha_completed : Use to restart the bot once captcha is solved\n $say <content> : Make the bot say whatever you want\n $react <messageID> : React with ✅ emoji\n $click <messageID> : Clicks the button which has ✅ emoji\n $help : To show this message ```"
        )
    }

    if (!isSleeping) {

        if (message.content.includes("Please tell us") && message.author.id === "716390085896962058") {
            isSleeping = true;
            message.channel.send("<@909818955902894090>");
            setTimeout(async function() {
                isSleeping = false
            }, 120) //2 minutes



        } if (message.content.includes("Best name:") && message.author.id === "854233015475109888") {
            message.channel.send("<@716390085896962058> h");

        } else if (message.content.startsWith("$say") && message.author.id == config.OwnerID) {
            let say = message.content.split(" ").slice(1).join(" ")
            message.channel.send(say)

        } else if (message.content.startsWith("$react") && message.author.id == config.OwnerID) {
            let msg
            try {
                const args = message.content.slice(1).trim().split(/ +/g)
                msg = await message.channel.messages.fetch(args[1])
            } catch (err) {
                message.reply(`Please Specify the message ID as an arguement like "$react <messageID>"`)
            }
            if (msg) {
                try {
                    msg.react("✅")
                    message.react("✅")
                } catch (err) {
                    message.react("❌")
                    console.log(err)
                }
            }


        } else if (message.content.startsWith("$click") && message.author.id == config.OwnerID) {

            let msg
            try {
                var args = message.content.slice(1).trim().split(/ +/g)
                msg = await message.channel.messages.fetch(args[1])
            } catch (err) {
                message.reply(`Please Specify the message ID as an arguement like "$click <messageID>".`)
            }

            if (msg) {
                try {
                    await msg.clickButton();
                    message.react("✅")
                } catch (err) {
                    message.react("❌")
                    console.log(err)
                }
            }
        } else if (message.content == "That is the wrong pokémon!" && message.author.id == "716390085896962058") {
            message.channel.send(`<@716390085896962058> h`)
        } else if (message.author.id == "716390085896962058") {
            if (message?.embeds[0]?.footer?.text.includes("Spawns Remaining")) {
                await message.channel.send(`<@716390085896962058> h`)
                if ((message.embeds[0]?.footer?.text == "Incense: Active.\nSpawns Remaining: 0.")) {
                    message.channel.send(`<@716390085896962058> buy incense`)
                }

            } else if (message.content.includes("The pokémon is")) {
                let rarity;
                const pokemon = await solveHint(message)
                console.log(`Catching ${pokemon[0]}`)
                await message.channel.send(`<@716390085896962058> catch ${pokemon[0]}`)

                console.log("[" + message.guild.name + "/#" + message.channel.name + "] " + pokemon[0])
                try{
                 rarity = await checkRarity(`${pokemon[0]}`)
                } catch {
                    rarity = "Not Found in Database";
                }

                const channel6 = client.channels.cache.get(config.logChannelID)
                channel6.send("[" + message.guild.name + "/#" + message.channel.name + "] " + "**__" + pokemon[0] + "__** " + "Rarity " + rarity)


            }

        } else {

            const Pokebots = ["874910942490677270"]; //pokename
            if (allowedChannels.length > 0 && !allowedChannels.includes(message.channel.id)) {
                return;
            }
            if (Pokebots.includes(message.author.id)) {
                let preferredURL = null;
                message.embeds.forEach((e) => {
                    if (e.image) {
                        const imageURL = e.image.url;
                        if (imageURL.includes("prediction.png")) {
                            preferredURL = imageURL;
                        } else if (imageURL.includes("embed.png") && !preferredURL) {
                            preferredURL = imageURL;
                        }
                    }
                });

                if (preferredURL) {
                    let url = preferredURL;


                    async function main() {
                        try {
                            const res1 = await ocrSpace(url, {
                                apiKey: `${config.ocrSpaceApiKey}`
                            });
                            const name1 = res1.ParsedResults[0].ParsedText.split('\r')[0];
                            const name5 = name1.replace(/Q/g, 'R');
                            const name = findOutput(name5);

                            const delay = 500; //interval from 5-10seconds
                            console.log("A Pokemon Spawned, Catching in " + (delay / 1000) + "seconds")
                            setTimeout(async () => {
                                message.channel.send(`<@716390085896962058> catch ${name}`)
                                    .then(a => {}).catch(error => {
                                        console.error(error);
                                        const channel = client.channels.cache.get(config.errorChannelID)
                                        channel.send(error)
                                    })


                                const filter = (msg) => msg.author.id === "716390085896962058";
                                const collector = new Discord.MessageCollector(message.channel, filter, {
                                    max: 1,
                                    time: 13000
                                }); // Collect only one message in 5 seconds

                                collector.on('collect', async (collected) => {


                                    if (collected.content.includes("Congratulations")) {

                                        function capitalizeFirstLetter(str) {
                                            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                                        }

                                        let rareity;
                                        const name2 = capitalizeFirstLetter(name)
                                        try{
                                        rareity = await checkRarity(`${name2}`)
                                        } catch {
                                            rareity = "Not Found in Database"
                                        }
                                        const logchannel = client.channels.cache.get(config.logChannelID)
                                        logchannel.send("[hi chri]").then(b => {}).catch(error => {

                                            console.error(error);
                                            const channel = client.channels.cache.get(config.errorChannelID)
                                            channel.send(error)
                                        })

                                        collector.stop();


                                    }



                                });


                            }, delay);


                        } catch (error) {
                            console.error(error);
                            const channel = client.channels.cache.get(config.errorChannelID)
                            channel.send(error)
                        }
                    }
                    main()
                }

            }

        }
    }

});
// At the end of the code, add the following line
client.login("MTI1MjYyMzYyMzcwMTY1OTY5OA.G2haQb.55osAxq4pMSfHkIw3YUMUXtsUWeYYw9PEElT0s");
