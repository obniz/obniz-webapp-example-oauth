"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const graphql_request_1 = require("graphql-request");
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const fetch = require("node-fetch");
const obniz_io = `https://obniz.io`;
const api_obniz_io = `https://api.obniz.io`;
const WebAppId = process.env.ID;
const WebAppToken = process.env.TOKEN;
let token = null;
// ============================
// Web Server
// ============================
const expressApp = express_1.default();
const port = process.env.PORT || "8080";
expressApp.set("port", port);
expressApp.set("views", path_1.default.join(__dirname, "../../", "views"));
expressApp.set("view engine", "ejs");
expressApp.use(body_parser_1.default.json());
expressApp.use(body_parser_1.default.urlencoded({ extended: false }));
// routing
expressApp.get("/", async (req, res, next) => {
    let user;
    let devices;
    if (token) {
        const graphQLClient = new graphql_request_1.GraphQLClient(`${api_obniz_io}/v1/graphql`, {
            headers: {
                authorization: `Bearer ${token}`,
            },
        });
        const query = `{
      user {
        id,
        name,
        email
      }
    }`;
        try {
            user = await graphQLClient.request(query);
            devices = await graphQLClient.request(`{
          devices(skip:0) {
            totalCount,
            pageInfo {
              hasNextPage,
              hasPreviousPage
            },
            edges{
              node {
                id,
                access_token
              }
            }
          }
        }`);
        }
        catch (e) {
            console.error(e);
            next(e);
        }
    }
    const redirect_uri = `http://localhost:${port}/code`;
    res.render("index", {
        webapp_id: WebAppId,
        redirect_uri,
        user,
        devices,
        oauth_uri: `${obniz_io}/login/oauth/authorize?webapp_id=${WebAppId}&redirect_uri=${redirect_uri}`,
    });
});
expressApp.get("/code", async (req, res, next) => {
    const code = req.query.code;
    try {
        const response = await fetch(`${obniz_io}/login/oauth/token?code=${code}`, {
            method: "post",
            headers: {
                "authorization": `Bearer ${WebAppToken}`,
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            res.status(500).send(`error`);
            return;
        }
        const json = await response.json();
        token = json.token;
        console.log(`token: ${token}`);
    }
    catch (e) {
        console.error(e);
        next(e);
        return;
    }
    res.redirect(`/`);
});
// Listen
const server = http_1.default.createServer(expressApp);
server.listen(port);
server.on("error", (e) => {
    console.error(e);
    process.exit(1);
});
server.on("listening", () => {
    console.log("listening");
});
