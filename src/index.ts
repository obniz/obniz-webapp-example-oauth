import bodyParser from "body-parser";
import express from "express";
import { GraphQLClient } from "graphql-request";
import http from "http";
import path from "path";
const fetch = require("node-fetch");

const obniz_io = `https://obniz.io`;
const api_obniz_io = `https://api.obniz.io`;
const WebAppId = process.env.ID;
const WebAppToken = process.env.TOKEN;

let token: string | null = null;

// ============================
// Web Server
// ============================

const expressApp = express();

const port = process.env.PORT || "8080";
expressApp.set("port", port);
expressApp.set("views", path.join(__dirname, "../", "views"));
expressApp.set("view engine", "ejs");
expressApp.use(bodyParser.json());
expressApp.use(bodyParser.urlencoded({ extended: false }));

// routing

expressApp.get("/", async (req: any, res: any) => {
  let user: any;
  let devices: any;

  if (token) {
    const graphQLClient = new GraphQLClient(`${api_obniz_io}/v1/graphql`, {
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

  const redirect_uri = `http://localhost:${port}/code`;
  res.render("index", {
    webapp_id: WebAppId,
    redirect_uri,
    user,
    devices,
    oauth_uri: `${obniz_io}/login/oauth/authorize?webapp_id=${WebAppId}&redirect_uri=${redirect_uri}`,
  });
});

expressApp.get("/code", async (req: any, res: any) => {
  const code = req.query.code;

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
  res.redirect(`/`);
});

// Listen

const server = http.createServer(expressApp);
server.listen(port);
server.on("error", (e: any) => {
  console.error(e);
  process.exit(1);
});
server.on("listening", () => {
  console.log("listening");
});
