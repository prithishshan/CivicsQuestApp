import OpenAI from "openai";
import express from "express";
import BodyParser from "body-parser";
import cors from "cors";
// // import sqlite from "sqlite3";
import { promises } from "fs";
import dotenv from "dotenv";

// const sql = sqlite.verbose();
var app = express();

// Middleware to parse JSON data
app.use(BodyParser.json());
app.use(cors());
dotenv.config();

const openAI = new OpenAI({
    organization: "org-GeYYLqj76eyVILZQMYl1nc3x",
    // apiKey: process.env.OPENAI_API_KEY,
});

app.listen(process.env.PORT, () => {
 console.log(`Server running on port ${process.env.PORT}`);
});

var moreInfo;

/* Get cases method: pass "id" param to get specific case, pass no params to get array of all cases*/
app.get("/case", async (req, res) => {
    const cases = await promises.readFile("./cases.json", {encoding: "utf8"}).then((data) => { return JSON.parse(data); });
 
    if (req.query.id == undefined) {
        res.status(200).json(cases);
    }
    else if (cases[req.query.id]){
        res.status(200).json(cases[req.query.id]);
        updateMoreInfo(cases[req.query.id], true);
    } else {
        res.status(404).json({error: "Case not found"});
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
                console.log(cases[req.query.caseId].senario);
                const damage = await openAI.chat.completions.create({
                    messages: [
                        {role:"system", name:"instructor", content: "You are facilitating a game about civics. You will be given a senario based on a real life case. You will also be given an attack, which is an article or amendment of the constitution. You must choose a damage level between '1' and '100' based on how releveant the attack is to the senario. Your response will be only an integer within the specified range."}, 
                        {role:"system", name:"attack", content: attacks[req.query.attackId].title}, 
                        {role:"system", name:"senario", content: cases[req.query.caseId].senario},
                        {role:"system", name:"original_case", content: cases[req.query.caseId].title}
                    ], 
                    model: "gpt-4-1106-preview", max_tokens: 1, n: 1
                });
                const response = await openAI.chat.completions.create({
                    messages: [
                        {role:"system", name:"instructor", content: "You are facilitating a game about civics. You will be given a senario based on a real life case. You will also be given an attack, which is an article or amendment of the constitution. You must choose a damage level between 1 and 100 based on how releveant the attack is to the senario."}, 
                        {role:"system", name:"attack", content: attacks[req.query.attackId].title}, 
                        {role:"system", name:"senario", content: cases[req.query.caseId].senario},
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
    res.status(200).json({data: moreInfo});
});

const updateMoreInfo = async (subject, isCase) => {
    if (isCase) {
        moreInfo = subject.pdfLink;
    } else {
        moreInfo = subject.legislation;
    }
}