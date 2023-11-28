import OpenAI from "openai";
import express from "express";
import BodyParser from "body-parser";
import cors from "cors";
import sqlite from "sqlite3";
import { promises } from "fs";

const sql = sqlite.verbose();
var app = express();

// Middleware to parse JSON data
app.use(BodyParser.json());
app.use(cors());

const openAI = new OpenAI({
    organization: "org-GeYYLqj76eyVILZQMYl1nc3x",
    apiKey: "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",
});

app.listen(8080, () => {
 console.log(`Server running on port 8080`);
});

var moreInfo = {};

/* Get cases method: pass "id" param to get specific case, pass no params to get array of all cases*/

app.get("/testUser", async (req, res) => {
    let db = new sql.Database("./users.db");
    await db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        won TEXT NOT NULL,
        lost TEXT NOT NULL
    );`, (err) =>{
        if (err)
            console.log(err);
    });
    const testWon = [0];
    const testLost = [];
    await db.run(`INSERT INTO users (id, username, password, won, lost) VALUES (0, 'LoC', 'password', '${JSON.stringify(testWon)}', '${JSON.stringify(testLost)}');`)
    res.status(200);
});
app.get("/case", async (req, res) => {
    const cases = await promises.readFile("./cases.json", {encoding: "utf8"}).then((data) => { return JSON.parse(data); });
    if (req.query.won) {

    } else {
      if (req.query.id) {
            if (cases[req.query.id]){
                res.status(200).json(cases[req.query.id]);
                updateMoreInfo(cases[req.query.id], true);
            } else {
                res.status(404).json({error: "Case not found"});
            }
        } else if (req.query.userId) {
                let db = new sql.Database("./users.db");
                db.get(`SELECT won, lost FROM users WHERE id = '${req.query.userId}';`, (err, row) => {
                    if (err) {
                        console.log(err);
                        // Handle the error, e.g., send an error response
                        res.status(500).json({error: "Error retrieving data"});
                    } else {
                        if (row) {
                            const won = JSON.parse(row.won);
                            const lost = JSON.parse(row.lost);
                            cases.forEach(caseSelected => {
                                console.log(won.includes(caseSelected.id));
                                if (won.includes(caseSelected.id)){
                                    caseSelected.state = "won";
                                } else if (lost.includes(caseSelected.id)) {
                                    caseSelected.state = "lost";
                                } else {
                                    caseSelected.state = "unplayed";
                                }
                            });
                            res.status(200).json(cases);
                        } else {
                            // Handle the case where no matching user is found
                            res.status(404).json({error: "User not found"});
                        }
                    }
                });
        } else {
            res.status(404).json({error: "User not specified"});
        }
    }
});

/* Get attacks method: pass "id" param to get specific attack, pass no params to get array of all attacks*/
app.get("/attack", async (req, res) => {
    const attacks = await promises.readFile("./attacks.json", {encoding: "utf8"}).then((data) => { return JSON.parse(data); });
 
    if (req.query.id == undefined) {
        res.status(200).json(attacks);
    }
    else if (attacks[req.query.id]){
        res.status(200).json(attacks[req.query.id]);
        updateMoreInfo(attacks[req.query.id], false);
    } else {
        res.status(404).json({error: "Attack not found"});
    }
});

/* Get interactions method: pass "caseId" and "attackId" params, generates response and returns it if it hasn't already been generated*/
app.get("/interaction", async (req, res) => {
    const interactions = await promises.readFile("./interactions.json", {encoding: "utf8"}).then((data) => {
        return JSON.parse(data);
    });
    const selectedInteraction = interactions.find((interaction) => (interaction.attackId == req.query.attackId && interaction.caseId == req.query.caseId));
    if (selectedInteraction) {
        res.status(200).json(selectedInteraction);
    }
    else {
        const cases = await promises.readFile("./cases.json", {encoding: "utf8"}).then((data) => { return JSON.parse(data); });
        const attacks = await promises.readFile("./attacks.json", {encoding: "utf8"}).then((data) => { return JSON.parse(data); });
        if (cases[req.query.caseId] && attacks[req.query.attackId]) {
                const damage = await openAI.chat.completions.create({
                    messages: [
                        {role:"system", name:"instructor", content: "You are facilitating a game about civics. You will be given a scenario based on a real life case. You will also be given an attack, which is an article or amendment of the constitution. You must choose a damage level between '1' and '100' based on how releveant the attack is to the scenario. Your response will be only an integer within the specified range."}, 
                        {role:"system", name:"attack", content: attacks[req.query.attackId].title}, 
                        {role:"system", name:"scenario", content: cases[req.query.caseId].scenario},
                        {role:"system", name:"original_case", content: cases[req.query.caseId].title}
                    ], 
                    model: "gpt-4-1106-preview", max_tokens: 1, n: 1
                });
                const response = await openAI.chat.completions.create({
                    messages: [
                        {role:"system", name:"instructor", content: "You are facilitating a game about civics. You will be given a scenario based on a real life case. You will also be given an attack, which is an article or amendment of the constitution. You must choose a damage level between 1 and 100 based on how releveant the attack is to the scenario."}, 
                        {role:"system", name:"attack", content: attacks[req.query.attackId].title}, 
                        {role:"system", name:"scenario", content: cases[req.query.caseId].scenario},
                        {role:"system", name:"original_case", content: cases[req.query.caseId].title},
                        {role:"assistant", name:"damage", content: damage.choices[0].message.content},
                        {role:"system", name:"instructor", content: "Explain why this attack was effective or not in one short sentence in present-tense, passive-voice."}, 
                    ], 
                    model: "gpt-4-1106-preview", max_tokens: 50, n: 1
                });
                const interaction = {
                    caseId: req.query.caseId,
                    attackId: req.query.attackId,
                    damage: damage.choices[0].message.content,
                    response: response.choices[0].message.content
                };
                res.status(200).json(interaction);
                interactions.push(interaction);
                promises.writeFile("./interactions.json", JSON.stringify(interactions), null, 2);
        } else {
            res.status(404).json({error: "Case or attack not found"});
        }
    }
});

app.get("/more_info", async (req, res) => {
    res.status(200).json(moreInfo);
});

const updateMoreInfo = async (subject, isCase) => {
    subject["isCase"] = isCase;
    moreInfo = subject;
}