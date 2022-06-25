/* This will be a configuration file that provides details
about the IMAP and SMTP server(s) the server will connect to and
where that information will be stored. */

const path = require("path");
const fs = require("fs");

export interface IServerInfo {
    smtp : {
        host: string,
        port: number,
        auth: {
            user: string,
            pass: string
        }
    },
    imap : {
        host: string,
        port: number,
        auth: {
            user: string,
            pass: string
        }
    }
}

export let serverInfo: IServerInfo;
const rawInfo: string = fs.readFileSync(path.join(__dirname, "../serverInfo.json"));
serverInfo = JSON.parse(rawInfo);